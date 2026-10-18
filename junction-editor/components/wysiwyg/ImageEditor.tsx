'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface ImageData {
  src: string
  alt: string
  width?: number
  height?: number
  link?: string
  alignment?: 'left' | 'center' | 'right' | 'full'
}

interface ImageEditorProps {
  imageData: ImageData
  position: { x: number; y: number }
  onUpdate: (data: ImageData) => void
  onDelete: () => void
  onClose: () => void
}

type ImageSize = 'small' | 'medium' | 'large' | 'full'

const SIZE_WIDTHS: Record<ImageSize, string> = {
  small: '200px',
  medium: '400px',
  large: '600px',
  full: '100%',
}

export function ImageEditor({
  imageData,
  position,
  onUpdate,
  onDelete,
  onClose,
}: ImageEditorProps) {
  const [altText, setAltText] = useState(imageData.alt || '')
  const [linkUrl, setLinkUrl] = useState(imageData.link || '')
  const [size, setSize] = useState<ImageSize>(getSizeFromWidth(imageData.width))
  const [alignment, setAlignment] = useState(imageData.alignment || 'center')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const popoverRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Apply changes
  const handleApply = useCallback(() => {
    onUpdate({
      ...imageData,
      alt: altText,
      link: linkUrl || undefined,
      width: SIZE_WIDTHS[size] === '100%' ? undefined : parseInt(SIZE_WIDTHS[size]),
      alignment,
    })
    onClose()
  }, [imageData, altText, linkUrl, size, alignment, onUpdate, onClose])

  // Handle delete
  const handleDelete = useCallback(() => {
    if (confirm('Are you sure you want to remove this image?')) {
      onDelete()
      onClose()
    }
  }, [onDelete, onClose])

  // Calculate position to keep popover in viewport
  const popoverStyle: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(position.y, window.innerHeight - 400),
    left: Math.min(position.x, window.innerWidth - 320),
    zIndex: 50,
  }

  return (
    <div
      ref={popoverRef}
      style={popoverStyle}
      className="bg-white rounded-xl shadow-2xl border border-slate-200 w-80 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="font-medium text-navy text-sm">Edit Image</h3>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Preview */}
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <img
          src={imageData.src}
          alt={altText}
          className="max-h-32 mx-auto rounded shadow-sm"
        />
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Alt text */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Alt Text
          </label>
          <input
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe this image..."
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
          />
        </div>

        {/* Size */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Size
          </label>
          <div className="flex gap-1">
            {(['small', 'medium', 'large', 'full'] as ImageSize[]).map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`
                  flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors capitalize
                  ${size === s
                    ? 'bg-navy text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Alignment */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">
            Alignment
          </label>
          <div className="flex gap-1">
            <AlignButton
              icon={<AlignLeftIcon />}
              active={alignment === 'left'}
              onClick={() => setAlignment('left')}
              title="Align left"
            />
            <AlignButton
              icon={<AlignCenterIcon />}
              active={alignment === 'center'}
              onClick={() => setAlignment('center')}
              title="Align center"
            />
            <AlignButton
              icon={<AlignRightIcon />}
              active={alignment === 'right'}
              onClick={() => setAlignment('right')}
              title="Align right"
            />
          </div>
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <ChevronIcon className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
          Advanced options
        </button>

        {/* Advanced options */}
        {showAdvanced && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            {/* Link URL */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Link URL (optional)
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <TrashIcon />
          Remove
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 text-sm bg-navy text-white rounded-md hover:bg-navy-mid transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────

function getSizeFromWidth(width?: number): ImageSize {
  if (!width) return 'medium'
  if (width <= 200) return 'small'
  if (width <= 400) return 'medium'
  if (width <= 600) return 'large'
  return 'full'
}

// ──────────────────────────────────────────────────────────────────────────
// ALIGN BUTTON
// ──────────────────────────────────────────────────────────────────────────

interface AlignButtonProps {
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  title: string
}

function AlignButton({ icon, active, onClick, title }: AlignButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        flex-1 p-2 rounded transition-colors
        ${active
          ? 'bg-navy text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }
      `}
    >
      {icon}
    </button>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// ICONS
// ──────────────────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function ChevronIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function AlignLeftIcon() {
  return (
    <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
    </svg>
  )
}

function AlignCenterIcon() {
  return (
    <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
    </svg>
  )
}

function AlignRightIcon() {
  return (
    <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />
    </svg>
  )
}
