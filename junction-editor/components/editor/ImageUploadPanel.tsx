'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useImageUpload, useAIGeneration, getAssetUrl } from '@/hooks'
import { supabase, type Asset } from '@/lib/supabase'
import { debounce } from '@/lib/editor-utils'

interface ImageUploadPanelProps {
  clientSlug?: string
  onSelect: (url: string, alt?: string) => void
  onClose: () => void
  defaultTab?: 'upload' | 'library' | 'url' | 'ai'
}

type Tab = 'upload' | 'library' | 'url' | 'ai'

export function ImageUploadPanel({ clientSlug, onSelect, onClose, defaultTab = 'upload' }: ImageUploadPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab)
  const [urlInput, setUrlInput] = useState('')
  const [altText, setAltText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // AI generation state
  const [aiPrompt, setAiPrompt] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploading, progress, uploadImage } = useImageUpload()
  const { generating, templates, loadTemplates, generateImage } = useAIGeneration()

  // Debounced search function
  const debouncedLoadAssets = useMemo(
    () => debounce((query: string) => {
      loadAssetsWithQuery(query)
    }, 300),
    []
  )

  // Ensure client-side only rendering for portal
  useEffect(() => {
    setMounted(true)
    return () => {
      // Clean up debounce on unmount
      debouncedLoadAssets.cancel?.()
    }
  }, [debouncedLoadAssets])

  // Load data based on default tab
  useEffect(() => {
    if (!mounted) return
    if (defaultTab === 'ai') {
      loadTemplates()
    } else if (defaultTab === 'library') {
      loadAssets()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // Load assets from library with optional query
  const loadAssetsWithQuery = useCallback(async (query: string = '') => {
    setLoadingAssets(true)
    try {
      let dbQuery = supabase
        .from('assets')
        .select('*')
        .in('mime_type', ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (query.trim()) {
        // Escape special SQL characters
        const escapedQuery = query.replace(/[%_]/g, '\\$&')
        dbQuery = dbQuery.ilike('filename', `%${escapedQuery}%`)
      }

      const { data, error } = await dbQuery

      if (error) {
        console.error('Error loading assets:', error)
      } else {
        setAssets(data || [])
      }
    } finally {
      setLoadingAssets(false)
    }
  }, [])

  // Load assets without query (for initial load)
  const loadAssets = useCallback(() => {
    loadAssetsWithQuery(searchQuery)
  }, [loadAssetsWithQuery, searchQuery])

  // Load assets when switching to library tab
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    if (tab === 'library') {
      loadAssets()
    }
    if (tab === 'ai') {
      loadTemplates()
    }
  }

  // Handle AI image generation
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return

    const result = await generateImage({
      prompt: aiPrompt.trim(),
      template: selectedTemplate || undefined,
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid',
      saveToLibrary: true,
      clientSlug,
      category: selectedTemplate || 'ai-generated',
    })

    if (result) {
      onSelect(result.imageUrl, altText || `AI generated: ${aiPrompt}`)
    }
  }

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    const asset = await uploadImage(file, { clientSlug })
    if (asset) {
      const url = getAssetUrl(asset.storage_path)
      onSelect(url, altText || file.name)
    }
  }

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  // Handle URL submission
  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onSelect(urlInput.trim(), altText)
    }
  }

  // Handle asset selection from library
  const handleAssetSelect = (asset: Asset) => {
    const url = getAssetUrl(asset.storage_path)
    onSelect(url, altText || asset.filename)
  }

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-dropdown w-full max-w-lg mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy/10">
          <h2 className="font-display font-semibold text-navy">Insert Image</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-navy rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-navy/10">
          {(['upload', 'library', 'ai', 'url'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? tab === 'ai' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-navy border-b-2 border-navy'
                  : 'text-muted hover:text-navy'
              }`}
            >
              {tab === 'upload' && 'Upload'}
              {tab === 'library' && 'Library'}
              {tab === 'ai' && (
                <span className="flex items-center gap-1 justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI
                </span>
              )}
              {tab === 'url' && 'URL'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-mint-dark bg-mint/10'
                    : 'border-navy/20 hover:border-navy/40'
                }`}
              >
                {uploading ? (
                  <div>
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-mint/20 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-navy border-t-transparent" />
                    </div>
                    <p className="text-sm text-muted">Uploading... {progress}%</p>
                    <div className="mt-2 h-1 bg-navy/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-navy transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-mint/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-navy font-medium mb-1">
                      Drop an image here or click to upload
                    </p>
                    <p className="text-xs text-muted">
                      JPEG, PNG, GIF, WebP, or SVG up to 10MB
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              {/* Alt text */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-navy mb-1">
                  Alt text (optional)
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image for accessibility"
                  className="w-full px-3 py-2 border border-navy/15 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>
            </div>
          )}

          {/* Library Tab */}
          {activeTab === 'library' && (
            <div>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value
                    setSearchQuery(value)
                    debouncedLoadAssets(value)
                  }}
                  placeholder="Search images..."
                  className="w-full px-3 py-2 border border-navy/15 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              {/* Asset Grid */}
              {loadingAssets ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-navy border-t-transparent" />
                </div>
              ) : assets.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => handleAssetSelect(asset)}
                      className="aspect-square rounded-md overflow-hidden border-2 border-transparent hover:border-navy focus:border-navy transition-colors"
                    >
                      <img
                        src={getAssetUrl(asset.storage_path)}
                        alt={asset.filename}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted">
                  <p>No images in library yet</p>
                  <p className="text-sm mt-1">Upload images to build your library</p>
                </div>
              )}

              {/* Alt text */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-navy mb-1">
                  Alt text (optional)
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image for accessibility"
                  className="w-full px-3 py-2 border border-navy/15 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>
            </div>
          )}

          {/* AI Tab */}
          {activeTab === 'ai' && (
            <div>
              {/* Template Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-navy mb-2">
                  Image Type
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  <button
                    onClick={() => setSelectedTemplate('')}
                    className={`p-2 rounded-lg border text-left text-xs transition-all ${
                      !selectedTemplate
                        ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                        : 'border-navy/15 hover:border-navy/30'
                    }`}
                  >
                    <div className="font-medium text-navy">Custom</div>
                    <div className="text-muted truncate">Free-form prompt</div>
                  </button>
                  {templates.slice(0, 5).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-2 rounded-lg border text-left text-xs transition-all ${
                        selectedTemplate === template.id
                          ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                          : 'border-navy/15 hover:border-navy/30'
                      }`}
                    >
                      <div className="font-medium text-navy">{template.name}</div>
                      <div className="text-muted truncate">{template.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-navy mb-1">
                  Describe your image
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., a modern coffee shop interior with warm lighting"
                  rows={2}
                  className="w-full px-3 py-2 border border-navy/15 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                />
              </div>

              {/* Alt text */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-navy mb-1">
                  Alt text (optional)
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image for accessibility"
                  className="w-full px-3 py-2 border border-navy/15 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <button
                onClick={handleAIGenerate}
                disabled={generating || !aiPrompt.trim()}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate & Insert
                  </>
                )}
              </button>

              <p className="mt-2 text-xs text-center text-muted">
                ~$0.04 per image. Saved automatically to your library.
              </p>
            </div>
          )}

          {/* URL Tab */}
          {activeTab === 'url' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-navy mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-navy/15 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-navy mb-1">
                  Alt text (optional)
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image for accessibility"
                  className="w-full px-3 py-2 border border-navy/15 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
                className="w-full py-2 bg-navy text-white rounded-md font-medium hover:bg-navy-mid disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Insert Image
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
