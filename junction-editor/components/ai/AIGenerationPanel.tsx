'use client'

import { useState, useEffect } from 'react'
import { useAIGeneration, type PromptTemplate } from '@/hooks'
import { Tooltip } from '@/components/ui'

interface AIGenerationPanelProps {
  clientSlug?: string
  onImageGenerated?: (imageUrl: string, asset?: any) => void
  onClose?: () => void
  compact?: boolean
}

const SIZE_OPTIONS = [
  { value: '1024x1024', label: 'Square (1024x1024)', description: 'Best for social media posts' },
  { value: '1792x1024', label: 'Landscape (1792x1024)', description: 'Best for website banners' },
  { value: '1024x1792', label: 'Portrait (1024x1792)', description: 'Best for stories and pins' },
] as const

const QUALITY_OPTIONS = [
  { value: 'standard', label: 'Standard', description: 'Fast generation' },
  { value: 'hd', label: 'HD', description: 'More detail and consistency' },
] as const

const STYLE_OPTIONS = [
  { value: 'vivid', label: 'Vivid', description: 'Bold, dramatic images' },
  { value: 'natural', label: 'Natural', description: 'Realistic, subtle images' },
] as const

export function AIGenerationPanel({
  clientSlug,
  onImageGenerated,
  onClose,
  compact = false,
}: AIGenerationPanelProps) {
  const { generating, templates, loadTemplates, generateImage } = useAIGeneration()

  const [prompt, setPrompt] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [size, setSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024')
  const [quality, setQuality] = useState<'standard' | 'hd'>('standard')
  const [style, setStyle] = useState<'vivid' | 'natural'>('vivid')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Load templates on mount
  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    const result = await generateImage({
      prompt: prompt.trim(),
      template: selectedTemplate || undefined,
      size,
      quality,
      style,
      saveToLibrary: true,
      clientSlug,
      category: selectedTemplate || 'ai-generated',
    })

    if (result) {
      setGeneratedImage(result.imageUrl)
      onImageGenerated?.(result.imageUrl, result.savedAsset)
    }
  }

  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate)

  return (
    <div className={`bg-white rounded-xl border border-navy/10 shadow-lg ${compact ? '' : 'p-6'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${compact ? 'p-4 border-b border-navy/10' : 'mb-6'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="font-display font-bold text-navy">AI Image Generator</h3>
            <p className="text-xs text-muted">Powered by DALL-E 3</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-navy rounded-lg hover:bg-cream transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className={compact ? 'p-4 space-y-4' : 'space-y-4'}>
        {/* Template Selection */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">
            Image Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setSelectedTemplate('')}
              className={`p-3 rounded-lg border text-left transition-all ${
                !selectedTemplate
                  ? 'border-navy bg-navy/5 ring-1 ring-navy'
                  : 'border-navy/15 hover:border-navy/30'
              }`}
            >
              <div className="text-sm font-medium text-navy">Custom</div>
              <div className="text-xs text-muted">Free-form prompt</div>
            </button>
            {templates.slice(0, 7).map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedTemplate === template.id
                    ? 'border-navy bg-navy/5 ring-1 ring-navy'
                    : 'border-navy/15 hover:border-navy/30'
                }`}
              >
                <div className="text-sm font-medium text-navy">{template.name}</div>
                <div className="text-xs text-muted line-clamp-1">{template.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <label className="block text-sm font-medium text-navy mb-2">
            {selectedTemplateData ? `Describe your ${selectedTemplateData.name.toLowerCase()}` : 'Describe your image'}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              selectedTemplateData
                ? `e.g., "a coffee shop launching a new seasonal menu"`
                : 'e.g., "a modern office space with natural lighting and plants"'
            }
            rows={3}
            className="w-full px-4 py-3 border border-navy/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
          />
          {selectedTemplateData && (
            <p className="mt-2 text-xs text-muted">
              Your prompt will be enhanced: "{selectedTemplateData.prefix} <span className="text-navy">[your description]</span>. {selectedTemplateData.suffix}"
            </p>
          )}
        </div>

        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted hover:text-navy transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced Options
        </button>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4 p-4 bg-cream/50 rounded-lg">
            {/* Size */}
            <div>
              <label className="block text-sm font-medium text-navy mb-2">Size</label>
              <div className="grid grid-cols-3 gap-2">
                {SIZE_OPTIONS.map((option) => (
                  <Tooltip key={option.value} content={option.description}>
                    <button
                      onClick={() => setSize(option.value)}
                      className={`p-2 rounded-lg border text-sm transition-all ${
                        size === option.value
                          ? 'border-navy bg-navy text-white'
                          : 'border-navy/15 hover:border-navy/30 text-navy'
                      }`}
                    >
                      {option.label}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Quality & Style */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-2">Quality</label>
                <div className="flex gap-2">
                  {QUALITY_OPTIONS.map((option) => (
                    <Tooltip key={option.value} content={option.description}>
                      <button
                        onClick={() => setQuality(option.value)}
                        className={`flex-1 p-2 rounded-lg border text-sm transition-all ${
                          quality === option.value
                            ? 'border-navy bg-navy text-white'
                            : 'border-navy/15 hover:border-navy/30 text-navy'
                        }`}
                      >
                        {option.label}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-2">Style</label>
                <div className="flex gap-2">
                  {STYLE_OPTIONS.map((option) => (
                    <Tooltip key={option.value} content={option.description}>
                      <button
                        onClick={() => setStyle(option.value)}
                        className={`flex-1 p-2 rounded-lg border text-sm transition-all ${
                          style === option.value
                            ? 'border-navy bg-navy text-white'
                            : 'border-navy/15 hover:border-navy/30 text-navy'
                        }`}
                      >
                        {option.label}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Image
            </>
          )}
        </button>

        {/* Generated Image Preview */}
        {generatedImage && (
          <div className="mt-4 p-4 bg-cream/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-navy">Generated Image</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onImageGenerated?.(generatedImage)
                    onClose?.()
                  }}
                  className="px-3 py-1 bg-navy text-white text-sm rounded-md hover:bg-navy-mid transition-colors"
                >
                  Use Image
                </button>
                <button
                  onClick={() => setGeneratedImage(null)}
                  className="px-3 py-1 text-muted text-sm hover:text-navy transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <img
              src={generatedImage}
              alt="Generated"
              className="w-full rounded-lg shadow-card"
            />
          </div>
        )}

        {/* Cost Notice */}
        <p className="text-xs text-center text-muted">
          Each generation costs approximately $0.04-0.08. Images are auto-saved to your asset library.
        </p>
      </div>
    </div>
  )
}
