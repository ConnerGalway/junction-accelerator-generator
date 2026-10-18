'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Asset } from '@/lib/supabase'
import { useImageUpload, getAssetUrl } from '@/hooks'
import { toast } from 'sonner'

interface AssetSidebarProps {
  clientSlug: string
  onAssetSelect?: (asset: Asset, url: string) => void
  onDragStart?: (asset: Asset, url: string) => void
  onDragEnd?: () => void
  isOpen: boolean
  onClose: () => void
}

type AssetFilter = 'all' | 'library' | 'client' | 'ai'

export function AssetSidebar({
  clientSlug,
  onAssetSelect,
  onDragStart,
  onDragEnd,
  isOpen,
  onClose,
}: AssetSidebarProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<AssetFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  const { uploading, progress, uploadImage } = useImageUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ────────────────────────────────────────────────────────────────────────
  // LOAD ASSETS
  // ────────────────────────────────────────────────────────────────────────

  const loadAssets = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      // Apply filter
      if (filter === 'library') {
        query = query.is('client_slug', null)
      } else if (filter === 'client') {
        query = query.eq('client_slug', clientSlug)
      } else if (filter === 'ai') {
        query = query.eq('ai_generated', true)
      }

      const { data, error } = await query

      if (error) {
        console.error('Failed to load assets:', error)
        toast.error('Failed to load assets')
        return
      }

      setAssets(data || [])
    } catch (err) {
      console.error('Load assets error:', err)
    } finally {
      setLoading(false)
    }
  }, [clientSlug, filter])

  useEffect(() => {
    if (isOpen) {
      loadAssets()
    }
  }, [isOpen, loadAssets])

  // ────────────────────────────────────────────────────────────────────────
  // FILTER ASSETS
  // ────────────────────────────────────────────────────────────────────────

  const filteredAssets = assets.filter(asset => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      asset.filename.toLowerCase().includes(query) ||
      asset.tags.some(tag => tag.toLowerCase().includes(query)) ||
      (asset.category && asset.category.toLowerCase().includes(query))
    )
  })

  // ────────────────────────────────────────────────────────────────────────
  // UPLOAD HANDLER
  // ────────────────────────────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const asset = await uploadImage(file, { clientSlug })
    if (asset) {
      setAssets(prev => [asset, ...prev])
      setShowUpload(false)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [uploadImage, clientSlug])

  // ────────────────────────────────────────────────────────────────────────
  // DRAG HANDLERS
  // ────────────────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, asset: Asset) => {
    const url = getAssetUrl(asset.storage_path)

    // Set drag data
    e.dataTransfer.setData('text/plain', url)
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'asset',
      assetId: asset.id,
      url,
      filename: asset.filename,
      width: asset.width,
      height: asset.height,
    }))
    e.dataTransfer.effectAllowed = 'copy'

    // Create drag image
    const img = new Image()
    img.src = url
    e.dataTransfer.setDragImage(img, 50, 50)

    onDragStart?.(asset, url)
  }, [onDragStart])

  const handleDragEnd = useCallback(() => {
    onDragEnd?.()
  }, [onDragEnd])

  // ────────────────────────────────────────────────────────────────────────
  // CLICK HANDLER
  // ────────────────────────────────────────────────────────────────────────

  const handleAssetClick = useCallback((asset: Asset) => {
    const url = getAssetUrl(asset.storage_path)
    onAssetSelect?.(asset, url)
  }, [onAssetSelect])

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────

  if (!isOpen) return null

  return (
    <div className="asset-sidebar fixed left-0 top-0 h-full w-72 bg-white border-r border-slate-200 shadow-lg z-30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h2 className="font-display font-bold text-navy">Assets</h2>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex px-4 py-2 gap-1 border-b border-slate-100">
        {(['all', 'library', 'client', 'ai'] as AssetFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-2 py-1 text-xs font-medium rounded transition-colors capitalize
              ${filter === f
                ? 'bg-navy text-white'
                : 'text-slate-500 hover:bg-slate-100'
              }
            `}
          >
            {f === 'ai' ? 'AI' : f}
          </button>
        ))}
      </div>

      {/* Upload button */}
      <div className="px-4 py-3 border-b border-slate-100">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`
            w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
            ${uploading
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-navy text-white hover:bg-navy-mid'
            }
          `}
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Uploading... {progress}%</span>
            </>
          ) : (
            <>
              <UploadIcon />
              <span>Upload Image</span>
            </>
          )}
        </button>
      </div>

      {/* Asset grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-navy border-t-transparent" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No assets found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-navy hover:underline mt-2"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onClick={() => handleAssetClick(asset)}
                onDragStart={(e) => handleDragStart(e, asset)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
        {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// ASSET CARD
// ──────────────────────────────────────────────────────────────────────────

interface AssetCardProps {
  asset: Asset
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function AssetCard({ asset, onClick, onDragStart, onDragEnd }: AssetCardProps) {
  const url = getAssetUrl(asset.storage_path)
  const isImage = asset.mime_type.startsWith('image/')

  return (
    <div
      className="group relative aspect-square bg-slate-100 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border border-slate-200 hover:border-navy/50 transition-colors"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      {isImage ? (
        <img
          src={url}
          alt={asset.filename}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <FileIcon className="w-8 h-8 text-slate-400" />
        </div>
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-navy/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <DragIcon className="w-6 h-6 text-white" />
      </div>

      {/* AI badge */}
      {asset.ai_generated && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-500 text-white text-[10px] font-medium rounded">
          AI
        </div>
      )}

      {/* Filename tooltip */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent">
        <p className="text-[10px] text-white truncate">{asset.filename}</p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// ICONS
// ──────────────────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}

function ImageIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function FileIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

function DragIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  )
}
