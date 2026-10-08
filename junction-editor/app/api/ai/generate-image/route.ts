import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// Lazy-initialize clients to avoid build errors
let openai: OpenAI | null = null
let supabase: ReturnType<typeof createClient> | null = null

// Simple in-memory rate limiter
// Note: In production with multiple serverless instances, use Redis or similar
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 5 // 5 requests per minute per IP

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  // Clean up expired entries periodically
  if (Math.random() < 0.1) {
    const keysToDelete: string[] = []
    rateLimitMap.forEach((value, key) => {
      if (value.resetTime < now) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => rateLimitMap.delete(key))
  }

  if (!record || record.resetTime < now) {
    // New window
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW }
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now }
  }

  record.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count, resetIn: record.resetTime - now }
}

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabase
}

// Prompt templates for common marketing use cases
const PROMPT_TEMPLATES = {
  'social-post': {
    name: 'Social Media Post',
    description: 'Eye-catching social media graphics',
    prefix: 'Create a professional, eye-catching social media graphic for',
    suffix: 'Modern, clean design with bold colors, suitable for Instagram or Facebook. No text in the image.',
  },
  'hero-image': {
    name: 'Website Hero',
    description: 'Large banner images for websites',
    prefix: 'Create a stunning hero image for a website about',
    suffix: 'Professional, high-quality, cinematic lighting, wide aspect ratio composition. No text.',
  },
  'product-mockup': {
    name: 'Product Mockup',
    description: 'Product showcase images',
    prefix: 'Create a professional product mockup showing',
    suffix: 'Clean white or gradient background, studio lighting, commercial photography style. No text.',
  },
  'infographic-bg': {
    name: 'Infographic Background',
    description: 'Abstract backgrounds for infographics',
    prefix: 'Create an abstract, modern background pattern for an infographic about',
    suffix: 'Subtle, professional, with space for text overlay. Soft gradients, geometric shapes.',
  },
  'team-culture': {
    name: 'Team & Culture',
    description: 'Workplace and team imagery',
    prefix: 'Create a warm, authentic image representing',
    suffix: 'Diverse, professional, modern office environment. Natural lighting, candid feel. No text.',
  },
  'icon-illustration': {
    name: 'Icon Illustration',
    description: 'Stylized icons and illustrations',
    prefix: 'Create a modern, flat-style illustration icon representing',
    suffix: 'Minimal, vector-style, vibrant colors on white background. Single concept, no text.',
  },
  'email-header': {
    name: 'Email Header',
    description: 'Banner images for email campaigns',
    prefix: 'Create a professional email header banner for',
    suffix: 'Clean, professional, horizontal composition. Suitable for email marketing. No text.',
  },
  'ad-creative': {
    name: 'Ad Creative',
    description: 'Images for digital advertising',
    prefix: 'Create a compelling advertising image for',
    suffix: 'Bold, attention-grabbing, high contrast. Suitable for digital ads. No text in image.',
  },
}

type PromptTemplateKey = keyof typeof PROMPT_TEMPLATES

interface GenerateImageRequest {
  prompt: string
  template?: PromptTemplateKey
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
  saveToLibrary?: boolean
  clientSlug?: string
  category?: string
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    const rateLimit = checkRateLimit(clientIP)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${Math.ceil(rateLimit.resetIn / 1000)} seconds.` },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000)),
          }
        }
      )
    }

    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const body: GenerateImageRequest = await request.json()
    const {
      prompt,
      template,
      size = '1024x1024',
      quality = 'standard',
      style = 'vivid',
      saveToLibrary = true,
      clientSlug,
      category = 'ai-generated',
    } = body

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Build the full prompt using template if provided
    let fullPrompt = prompt
    if (template && PROMPT_TEMPLATES[template]) {
      const t = PROMPT_TEMPLATES[template]
      fullPrompt = `${t.prefix} ${prompt}. ${t.suffix}`
    }

    // Generate image with DALL-E 3
    const response = await getOpenAI().images.generate({
      model: 'dall-e-3',
      prompt: fullPrompt,
      n: 1,
      size,
      quality,
      style,
      response_format: 'url',
    })

    if (!response.data || response.data.length === 0) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      )
    }

    const imageUrl = response.data[0].url
    const revisedPrompt = response.data[0].revised_prompt

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      )
    }

    let savedAsset = null

    // Save to asset library if requested
    if (saveToLibrary) {
      try {
        // Fetch the image
        const imageResponse = await fetch(imageUrl)
        const imageBlob = await imageResponse.blob()
        const arrayBuffer = await imageBlob.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Generate unique filename
        const timestamp = Date.now()
        const filename = `ai-${timestamp}.png`
        const storagePath = clientSlug
          ? `${clientSlug}/${filename}`
          : `shared/${filename}`

        // Upload to Supabase Storage
        const { error: uploadError } = await getSupabase().storage
          .from('assets')
          .upload(storagePath, buffer, {
            contentType: 'image/png',
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
        } else {
          // Save asset record to database
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: asset, error: dbError } = await (getSupabase() as any)
            .from('assets')
            .insert({
              storage_path: storagePath,
              filename,
              mime_type: 'image/png',
              file_size: buffer.length,
              width: parseInt(size.split('x')[0]),
              height: parseInt(size.split('x')[1]),
              category,
              client_slug: clientSlug || null,
              ai_generated: true,
              ai_prompt: fullPrompt,
              uploaded_by: 'ai-generator',
              tags: ['ai-generated', template || 'custom'],
            })
            .select()
            .single()

          if (dbError) {
            console.error('Database error:', dbError)
          } else {
            savedAsset = asset
          }
        }
      } catch (saveError) {
        console.error('Error saving to library:', saveError)
        // Continue - we still have the URL
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      revisedPrompt,
      savedAsset,
    })
  } catch (error: any) {
    console.error('AI generation error:', error)

    // Handle specific OpenAI errors
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'OpenAI API key is invalid or expired. Please check your OPENAI_API_KEY.' },
        { status: 401 }
      )
    }

    if (error?.status === 400) {
      const message = error?.message || 'Invalid prompt'
      return NextResponse.json(
        { error: `OpenAI rejected the request: ${message}` },
        { status: 400 }
      )
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      )
    }

    // Log the full error for debugging
    const errorMessage = error?.message || error?.error?.message || 'Unknown error'
    console.error('Full error details:', JSON.stringify(error, null, 2))

    return NextResponse.json(
      { error: `Failed to generate image: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// GET endpoint to return available templates
export async function GET() {
  return NextResponse.json({
    templates: Object.entries(PROMPT_TEMPLATES).map(([key, value]) => ({
      id: key,
      ...value,
    })),
  })
}
