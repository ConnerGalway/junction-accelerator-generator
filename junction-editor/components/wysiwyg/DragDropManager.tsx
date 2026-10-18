'use client'

import { useState, useCallback, useRef, createContext, useContext, type ReactNode } from 'react'
import { type Asset } from '@/lib/supabase'
import { type UseWYSIWYGBridgeReturn } from '@/hooks/useWYSIWYGBridge'
import { toast } from 'sonner'

// ──────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────

interface DragData {
  type: 'asset' | 'external'
  asset?: Asset
  url: string
  filename?: string
  width?: number
  height?: number
}

interface DropZoneState {
  isActive: boolean
  targetKey: string | null
}

interface DragDropState {
  isDragging: boolean
  dragData: DragData | null
  dropZone: DropZoneState
}

interface DragDropContextValue {
  state: DragDropState
  // Drag operations
  startDrag: (data: DragData) => void
  endDrag: () => void
  // Drop zone operations
  setDropTarget: (key: string | null) => void
  // Integration
  handleMediaDrop: (key: string, x: number, y: number) => void
}

// ──────────────────────────────────────────────────────────────────────────
// CONTEXT
// ──────────────────────────────────────────────────────────────────────────

const DragDropContext = createContext<DragDropContextValue | null>(null)

export function useDragDrop() {
  const context = useContext(DragDropContext)
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider')
  }
  return context
}

// ──────────────────────────────────────────────────────────────────────────
// PROVIDER
// ──────────────────────────────────────────────────────────────────────────

interface DragDropProviderProps {
  children: ReactNode
  bridge: UseWYSIWYGBridgeReturn | null
  onMediaInserted?: (key: string, url: string) => void
}

export function DragDropProvider({
  children,
  bridge,
  onMediaInserted,
}: DragDropProviderProps) {
  const [state, setState] = useState<DragDropState>({
    isDragging: false,
    dragData: null,
    dropZone: {
      isActive: false,
      targetKey: null,
    },
  })

  // Track drag data even across iframe boundary
  const dragDataRef = useRef<DragData | null>(null)

  // ────────────────────────────────────────────────────────────────────────
  // DRAG OPERATIONS
  // ────────────────────────────────────────────────────────────────────────

  const startDrag = useCallback((data: DragData) => {
    // Store in both state and ref (ref persists across iframe boundary)
    dragDataRef.current = data
    setState(prev => ({
      ...prev,
      isDragging: true,
      dragData: data,
    }))

    // Enable drop zones in the iframe
    bridge?.enableDropZones()
  }, [bridge])

  const endDrag = useCallback(() => {
    dragDataRef.current = null
    setState(prev => ({
      ...prev,
      isDragging: false,
      dragData: null,
      dropZone: {
        isActive: false,
        targetKey: null,
      },
    }))

    // Disable drop zones in the iframe
    bridge?.disableDropZones()
  }, [bridge])

  // ────────────────────────────────────────────────────────────────────────
  // DROP ZONE OPERATIONS
  // ────────────────────────────────────────────────────────────────────────

  const setDropTarget = useCallback((key: string | null) => {
    setState(prev => ({
      ...prev,
      dropZone: {
        isActive: key !== null,
        targetKey: key,
      },
    }))
  }, [])

  // ────────────────────────────────────────────────────────────────────────
  // DROP HANDLER
  // ────────────────────────────────────────────────────────────────────────

  const handleMediaDrop = useCallback((key: string, x: number, y: number) => {
    // Get the drag data from ref (survives across iframe boundary)
    const data = dragDataRef.current

    if (!data) {
      console.warn('Drop occurred but no drag data available')
      toast.error('Could not insert image. Please try again.')
      endDrag()
      return
    }

    if (!bridge) {
      console.warn('Drop occurred but bridge not connected')
      toast.error('Editor not ready. Please try again.')
      endDrag()
      return
    }

    // Build the image HTML
    const imgHtml = buildImageHtml(data)

    // Insert into the target element
    bridge.insertMedia(key, imgHtml)

    // Notify callback
    onMediaInserted?.(key, data.url)

    // Show success message
    const filename = data.filename || 'Image'
    toast.success(`${filename} added`)

    // End the drag operation
    endDrag()
  }, [bridge, endDrag, onMediaInserted])

  // ────────────────────────────────────────────────────────────────────────
  // CONTEXT VALUE
  // ────────────────────────────────────────────────────────────────────────

  const value: DragDropContextValue = {
    state,
    startDrag,
    endDrag,
    setDropTarget,
    handleMediaDrop,
  }

  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────

function buildImageHtml(data: DragData): string {
  const { url, filename, width, height } = data

  // Build style string
  const styles = ['max-width: 100%', 'height: auto']

  if (width && width < 800) {
    // For smaller images, respect the width
    styles.push(`width: ${width}px`)
  }

  // Build alt text
  const alt = filename || 'Image'

  // Build size attributes if available
  const sizeAttrs = width && height
    ? `width="${width}" height="${height}"`
    : ''

  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="${styles.join('; ')}" ${sizeAttrs} />`
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
// VISUAL INDICATOR COMPONENT
// ──────────────────────────────────────────────────────────────────────────

interface DragOverlayProps {
  className?: string
}

export function DragOverlay({ className = '' }: DragOverlayProps) {
  const { state } = useDragDrop()

  if (!state.isDragging) {
    return null
  }

  return (
    <div
      className={`
        fixed inset-0 pointer-events-none z-20
        border-4 border-dashed border-green-400 bg-green-50/10
        transition-opacity
        ${className}
      `}
    >
      {/* Center indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg shadow-lg">
        <div className="flex items-center gap-2">
          <DropIcon className="w-4 h-4" />
          <span>
            {state.dropZone.isActive
              ? `Drop on: ${state.dropZone.targetKey}`
              : 'Drag to a content area to insert'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// ICONS
// ──────────────────────────────────────────────────────────────────────────

function DropIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  )
}
