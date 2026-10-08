'use client'

// Prevent static generation - this page requires runtime Supabase
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { supabase, type Asset } from '@/lib/supabase'
import { useImageUpload, getAssetUrl } from '@/hooks'
import { toast } from 'sonner'

// Asset categories based on tactic types
const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'social-media', label: 'Social Media' },
  { value: 'seo', label: 'SEO' },
  { value: 'email', label: 'Email Marketing' },
  { value: 'ads', label: 'Paid Ads' },
  { value: 'website', label: 'Website' },
  { value: 'branding', label: 'Branding' },
  { value: 'general', label: 'General' },
]

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploading, progress, uploadImage } = useImageUpload()

  // Load assets
  const loadAssets = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false })

      if (searchQuery) {
        query = query.ilike('filename', `%${searchQuery}%`)
      }

      if (categoryFilter) {
        query = query.eq('category', categoryFilter)
      }

      const { data, error } = await query.limit(100)

      if (error) {
        console.error('Error loading assets:', error)
        toast.error('Failed to load assets')
      } else {
        setAssets(data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [searchQuery, categoryFilter])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  // Handle file upload
  const handleFileSelect = async (files: FileList) => {
    for (const file of Array.from(files)) {
      await uploadImage(file, { category: categoryFilter || 'general' })
    }
    loadAssets()
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  // Delete asset
  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Delete "${asset.filename}"? This cannot be undone.`)) {
      return
    }

    try {
      // Delete from storage
      await supabase.storage.from('assets').remove([asset.storage_path])

      // Delete from database
      await supabase.from('assets').delete().eq('id', asset.id)

      toast.success('Asset deleted')
      setSelectedAsset(null)
      loadAssets()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete asset')
    }
  }

  // Copy URL to clipboard
  const handleCopyUrl = (asset: Asset) => {
    const url = getAssetUrl(asset.storage_path)
    navigator.clipboard.writeText(url)
    toast.success('URL copied to clipboard')
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-navy text-white">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-mint hover:text-mint-light transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Link>
            <div className="w-px h-6 bg-white/20" />
            <h1 className="font-display font-bold">Asset Library</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8">
        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mb-8 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-mint-dark bg-mint/10'
              : 'border-navy/20 hover:border-navy/40 bg-white'
          }`}
        >
          {uploading ? (
            <div>
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-navy border-t-transparent mx-auto mb-3" />
              <p className="text-navy font-medium">Uploading... {progress}%</p>
            </div>
          ) : (
            <div>
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-mint/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-navy font-medium mb-1">
                Drop files here or click to upload
              </p>
              <p className="text-sm text-muted">
                Images up to 10MB each
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="hidden"
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="w-full px-4 py-2 border border-navy/15 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-navy/15 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Asset Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-navy border-t-transparent" />
          </div>
        ) : assets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  selectedAsset?.id === asset.id
                    ? 'border-navy ring-2 ring-navy/20'
                    : 'border-transparent hover:border-navy/30'
                }`}
              >
                {asset.mime_type.startsWith('image/') ? (
                  <img
                    src={getAssetUrl(asset.storage_path)}
                    alt={asset.filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-cream-mid flex items-center justify-center">
                    <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs truncate">{asset.filename}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cream-mid flex items-center justify-center">
              <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-navy font-medium mb-1">No assets found</p>
            <p className="text-sm text-muted">
              {searchQuery || categoryFilter
                ? 'Try adjusting your filters'
                : 'Upload your first asset to get started'}
            </p>
          </div>
        )}

        {/* Asset Detail Panel */}
        {selectedAsset && (
          <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-dropdown z-30 animate-fade-in">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-navy/10">
                <h3 className="font-medium text-navy truncate">{selectedAsset.filename}</h3>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-1 text-muted hover:text-navy rounded transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Preview */}
              <div className="p-4 bg-cream-mid">
                {selectedAsset.mime_type.startsWith('image/') ? (
                  <img
                    src={getAssetUrl(selectedAsset.storage_path)}
                    alt={selectedAsset.filename}
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="aspect-video bg-white rounded-lg flex items-center justify-center">
                    <svg className="w-12 h-12 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider">Size</label>
                  <p className="text-sm text-navy">{formatFileSize(selectedAsset.file_size)}</p>
                </div>

                {selectedAsset.width && selectedAsset.height && (
                  <div>
                    <label className="text-xs text-muted uppercase tracking-wider">Dimensions</label>
                    <p className="text-sm text-navy">{selectedAsset.width} x {selectedAsset.height}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-muted uppercase tracking-wider">Type</label>
                  <p className="text-sm text-navy">{selectedAsset.mime_type}</p>
                </div>

                {selectedAsset.category && (
                  <div>
                    <label className="text-xs text-muted uppercase tracking-wider">Category</label>
                    <p className="text-sm text-navy capitalize">{selectedAsset.category.replace('-', ' ')}</p>
                  </div>
                )}

                {selectedAsset.tags && selectedAsset.tags.length > 0 && (
                  <div>
                    <label className="text-xs text-muted uppercase tracking-wider">Tags</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedAsset.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-mint/20 text-navy text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-muted uppercase tracking-wider">Uploaded</label>
                  <p className="text-sm text-navy">
                    {new Date(selectedAsset.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-muted">{selectedAsset.uploaded_by}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-navy/10 space-y-2">
                <button
                  onClick={() => handleCopyUrl(selectedAsset)}
                  className="w-full py-2 bg-navy text-white rounded-md font-medium hover:bg-navy-mid transition-colors"
                >
                  Copy URL
                </button>
                <button
                  onClick={() => handleDelete(selectedAsset)}
                  className="w-full py-2 bg-red-50 text-red-600 rounded-md font-medium hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
