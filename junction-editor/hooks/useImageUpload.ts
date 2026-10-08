'use client'

import { useState } from 'react'
import { supabase, type Asset } from '@/lib/supabase'
import { toast } from 'sonner'

interface UploadOptions {
  clientSlug?: string
  category?: string
  tags?: string[]
}

interface UseImageUploadReturn {
  uploading: boolean
  progress: number
  uploadImage: (file: File, options?: UploadOptions) => Promise<Asset | null>
  uploadFromUrl: (url: string, options?: UploadOptions) => Promise<Asset | null>
}

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed MIME types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

export function useImageUpload(): UseImageUploadReturn {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const uploadImage = async (
    file: File,
    options: UploadOptions = {}
  ): Promise<Asset | null> => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, or SVG).')
      return null
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 10MB.')
      return null
    }

    setUploading(true)
    setProgress(0)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in to upload images')
        return null
      }

      // Generate unique filename
      const ext = file.name.split('.').pop() || 'png'
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      const filename = `${timestamp}-${randomId}.${ext}`

      // Determine storage path
      const folder = options.clientSlug || 'library'
      const storagePath = `images/${folder}/${filename}`

      setProgress(20)

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        toast.error('Failed to upload image')
        return null
      }

      setProgress(60)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('assets')
        .getPublicUrl(storagePath)

      // Get image dimensions (for images)
      let width: number | undefined
      let height: number | undefined

      if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
        try {
          const dimensions = await getImageDimensions(file)
          width = dimensions.width
          height = dimensions.height
        } catch {
          // Ignore dimension errors
        }
      }

      setProgress(80)

      // Create asset record in database
      const { data: asset, error: dbError } = await supabase
        .from('assets')
        .insert({
          storage_path: storagePath,
          storage_bucket: 'assets',
          filename: file.name,
          mime_type: file.type,
          file_size: file.size,
          width,
          height,
          tags: options.tags || [],
          category: options.category || null,
          client_slug: options.clientSlug || null,
          uploaded_by: user.email,
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        // Try to clean up the uploaded file
        await supabase.storage.from('assets').remove([storagePath])
        toast.error('Failed to save asset record')
        return null
      }

      setProgress(100)
      toast.success('Image uploaded successfully')

      return {
        ...asset,
        // Add the public URL for convenience
        url: urlData.publicUrl,
      } as Asset & { url: string }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('An unexpected error occurred')
      return null
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const uploadFromUrl = async (
    url: string,
    options: UploadOptions = {}
  ): Promise<Asset | null> => {
    setUploading(true)
    setProgress(10)

    try {
      // Fetch the image
      const response = await fetch(url)
      if (!response.ok) {
        toast.error('Failed to fetch image from URL')
        return null
      }

      setProgress(30)

      const blob = await response.blob()
      const filename = url.split('/').pop()?.split('?')[0] || 'image.png'
      const file = new File([blob], filename, { type: blob.type })

      // Use the regular upload function
      return await uploadImage(file, options)
    } catch (error) {
      console.error('URL upload error:', error)
      toast.error('Failed to upload image from URL')
      return null
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return {
    uploading,
    progress,
    uploadImage,
    uploadFromUrl,
  }
}

// Helper to get image dimensions
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// Helper to get public URL for an asset
export function getAssetUrl(storagePath: string): string {
  const { data } = supabase.storage.from('assets').getPublicUrl(storagePath)
  return data.publicUrl
}
