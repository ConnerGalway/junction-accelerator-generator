'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { type Asset } from '@/lib/supabase'

export interface PromptTemplate {
  id: string
  name: string
  description: string
  prefix: string
  suffix: string
}

export interface GenerateImageOptions {
  prompt: string
  template?: string
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
  saveToLibrary?: boolean
  clientSlug?: string
  category?: string
}

export interface GeneratedImage {
  imageUrl: string
  revisedPrompt?: string
  savedAsset?: Asset | null
}

export function useAIGeneration() {
  const [generating, setGenerating] = useState(false)
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  // Load available templates
  const loadTemplates = useCallback(async () => {
    if (templatesLoaded) return templates

    try {
      const response = await fetch('/api/ai/generate-image')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates)
        setTemplatesLoaded(true)
        return data.templates
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
    return []
  }, [templatesLoaded, templates])

  // Generate an image
  const generateImage = useCallback(async (options: GenerateImageOptions): Promise<GeneratedImage | null> => {
    setGenerating(true)

    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image')
      }

      toast.success('Image generated successfully!')

      return {
        imageUrl: data.imageUrl,
        revisedPrompt: data.revisedPrompt,
        savedAsset: data.savedAsset,
      }
    } catch (error: any) {
      console.error('Generation error:', error)
      toast.error(error.message || 'Failed to generate image')
      return null
    } finally {
      setGenerating(false)
    }
  }, [])

  return {
    generating,
    templates,
    loadTemplates,
    generateImage,
  }
}
