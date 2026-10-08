import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Allowed MIME types (validated server-side)
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Magic bytes for file type validation
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP is RIFF-based)
}

function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  // SVG doesn't have magic bytes, check for XML-like content
  if (mimeType === 'image/svg+xml') {
    const text = new TextDecoder().decode(buffer.slice(0, 100))
    return text.includes('<svg') || text.includes('<?xml')
  }

  const bytes = new Uint8Array(buffer.slice(0, 8))
  const signatures = MAGIC_BYTES[mimeType]

  if (!signatures) return false

  return signatures.some(sig =>
    sig.every((byte, index) => bytes[index] === byte)
  )
}

let supabase: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabase
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const clientSlug = formData.get('clientSlug') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Validate MIME type (from Content-Type header)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG.' },
        { status: 400 }
      )
    }

    // Read file buffer for magic byte validation
    const buffer = await file.arrayBuffer()

    // Validate magic bytes (actual file content)
    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: 'File content does not match declared type.' },
        { status: 400 }
      )
    }

    // Generate storage path
    const timestamp = Date.now()
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${safeFilename}`
    const storagePath = clientSlug ? `${clientSlug}/${filename}` : `shared/${filename}`

    // Upload to Supabase Storage
    const { error: uploadError } = await getSupabase().storage
      .from('assets')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get image dimensions (for images)
    let width: number | null = null
    let height: number | null = null

    // Create asset record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: asset, error: dbError } = await (getSupabase() as any)
      .from('assets')
      .insert({
        storage_path: storagePath,
        filename: safeFilename,
        mime_type: file.type,
        file_size: file.size,
        width,
        height,
        client_slug: clientSlug || null,
        uploaded_by: 'editor',
        tags: [],
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Try to clean up the uploaded file
      await getSupabase().storage.from('assets').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to save asset record' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = getSupabase().storage
      .from('assets')
      .getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      asset: {
        ...asset,
        url: urlData.publicUrl,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
