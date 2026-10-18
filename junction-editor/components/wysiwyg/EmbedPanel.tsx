'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'

// ──────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────

type EmbedType = 'youtube' | 'vimeo' | 'loom' | 'iframe' | null

interface EmbedData {
  type: EmbedType
  url: string
  embedUrl: string
  title?: string
  width?: number
  height?: number
}

interface EmbedPanelProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (embedHtml: string) => void
}

// ──────────────────────────────────────────────────────────────────────────
// EMBED URL PARSERS
// ──────────────────────────────────────────────────────────────────────────

const EMBED_PATTERNS: { type: EmbedType; pattern: RegExp; getEmbedUrl: (match: RegExpMatchArray) => string }[] = [
  {
    type: 'youtube',
    pattern: /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    getEmbedUrl: (match) => `https://www.youtube.com/embed/${match[1]}`,
  },
  {
    type: 'vimeo',
    pattern: /(?:vimeo\.com\/)(\d+)/,
    getEmbedUrl: (match) => `https://player.vimeo.com/video/${match[1]}`,
  },
  {
    type: 'loom',
    pattern: /(?:loom\.com\/share\/)([a-zA-Z0-9]+)/,
    getEmbedUrl: (match) => `https://www.loom.com/embed/${match[1]}`,
  },
]

// Allowed domains for generic iframe embeds
const ALLOWED_IFRAME_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'player.vimeo.com',
  'loom.com',
  'www.loom.com',
  'docs.google.com',
  'drive.google.com',
  'forms.google.com',
  'sheets.google.com',
  'slides.google.com',
  'canva.com',
  'www.canva.com',
  'figma.com',
  'www.figma.com',
  'miro.com',
  'airtable.com',
  'notion.site',
  'calendly.com',
  'typeform.com',
]

function parseEmbedUrl(input: string): EmbedData | null {
  const trimmed = input.trim()

  // Try known video platforms first
  for (const { type, pattern, getEmbedUrl } of EMBED_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      return {
        type,
        url: trimmed,
        embedUrl: getEmbedUrl(match),
      }
    }
  }

  // Try to parse as a direct embed URL or iframe code
  try {
    // If it looks like iframe HTML, extract the src
    const iframeMatch = trimmed.match(/<iframe[^>]*src=["']([^"']+)["'][^>]*>/i)
    if (iframeMatch) {
      const url = new URL(iframeMatch[1])
      const domain = url.hostname

      if (ALLOWED_IFRAME_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
        return {
          type: 'iframe',
          url: iframeMatch[1],
          embedUrl: iframeMatch[1],
        }
      }
    }

    // Try as direct URL
    const url = new URL(trimmed)
    const domain = url.hostname

    if (ALLOWED_IFRAME_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
      return {
        type: 'iframe',
        url: trimmed,
        embedUrl: trimmed,
      }
    }
  } catch {
    // Invalid URL
  }

  return null
}

function getEmbedTypeName(type: EmbedType): string {
  switch (type) {
    case 'youtube': return 'YouTube'
    case 'vimeo': return 'Vimeo'
    case 'loom': return 'Loom'
    case 'iframe': return 'Embed'
    default: return 'Unknown'
  }
}

// ──────────────────────────────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────────────────────────────

export function EmbedPanel({ isOpen, onClose, onInsert }: EmbedPanelProps) {
  const [url, setUrl] = useState('')
  const [embedData, setEmbedData] = useState<EmbedData | null>(null)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '1:1'>('16:9')
  const [customTitle, setCustomTitle] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Parse URL on input change
  useEffect(() => {
    if (url.trim()) {
      const data = parseEmbedUrl(url)
      setEmbedData(data)
    } else {
      setEmbedData(null)
    }
  }, [url])

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Handle insert
  const handleInsert = useCallback(() => {
    if (!embedData) {
      toast.error('Please enter a valid embed URL')
      return
    }

    // Calculate dimensions based on aspect ratio
    const width = 640
    let height: number
    switch (aspectRatio) {
      case '16:9': height = 360; break
      case '4:3': height = 480; break
      case '1:1': height = 640; break
      default: height = 360
    }

    // Build the embed HTML
    const title = customTitle || getEmbedTypeName(embedData.type) + ' Video'
    const embedHtml = buildEmbedHtml(embedData.embedUrl, width, height, title)

    onInsert(embedHtml)
    toast.success(`${getEmbedTypeName(embedData.type)} embed inserted`)

    // Reset form
    setUrl('')
    setEmbedData(null)
    setCustomTitle('')
    onClose()
  }, [embedData, aspectRatio, customTitle, onInsert, onClose])

  // Handle paste - auto-detect and insert if valid
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text')
    const data = parseEmbedUrl(text)
    if (data && (data.type === 'youtube' || data.type === 'vimeo' || data.type === 'loom')) {
      // It's a known video type, the URL will be set automatically
      // No need to prevent default
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        ref={panelRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-display font-bold text-navy">Insert Embed</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Video or Embed URL
            </label>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={handlePaste}
              placeholder="Paste a YouTube, Vimeo, or Loom URL..."
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
            />
            <p className="mt-2 text-xs text-slate-500">
              Supports YouTube, Vimeo, Loom, Google Docs, Canva, Figma, and more
            </p>
          </div>

          {/* Preview */}
          {embedData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckIcon className="w-4 h-4" />
                <span>{getEmbedTypeName(embedData.type)} detected</span>
              </div>

              {/* Preview iframe */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
                <div className="aspect-video">
                  <iframe
                    src={embedData.embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-4">
                {/* Aspect ratio */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Aspect Ratio
                  </label>
                  <div className="flex gap-1">
                    {(['16:9', '4:3', '1:1'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`
                          flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors
                          ${aspectRatio === ratio
                            ? 'bg-navy text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }
                        `}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom title */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Video title..."
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Invalid URL message */}
          {url && !embedData && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <WarningIcon className="w-4 h-4" />
              <span>URL not recognized. Please enter a valid video or embed URL.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!embedData}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${embedData
                ? 'bg-navy text-white hover:bg-navy-mid'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            Insert Embed
          </button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────

function buildEmbedHtml(embedUrl: string, width: number, height: number, title: string): string {
  return `<div class="embed-container" style="position: relative; width: 100%; padding-bottom: ${(height / width) * 100}%; margin: 1rem 0;">
  <iframe
    src="${escapeHtml(embedUrl)}"
    title="${escapeHtml(title)}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
  ></iframe>
</div>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function WarningIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}
