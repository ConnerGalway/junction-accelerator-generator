'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardFrame, EditorToolbar, AssetSidebar, EmbedPanel, type UseWYSIWYGBridgeReturn } from '@/components/wysiwyg'
import { supabase, getUserRole, canEdit, type UserPlan, type Asset } from '@/lib/supabase'
import { toast } from 'sonner'
import { useEditLock, getAssetUrl } from '@/hooks'
import { LockIndicator } from '@/components/ui'

// API base for content edits
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/.netlify/functions'

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserPlan | null>(null)
  const [bridge, setBridge] = useState<UseWYSIWYGBridgeReturn | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showAssets, setShowAssets] = useState(false)
  const [showEmbedPanel, setShowEmbedPanel] = useState(false)

  // Edit lock
  const {
    hasLock,
    lockOwner,
    lockExpiresAt,
    isLoading: lockLoading,
    acquireLock,
    overrideLock,
  } = useEditLock(slug, userRole)

  // Can override locks? Only admin/PSM
  const canOverride = userRole?.role === 'admin' || userRole?.role === 'psm'

  // Is editing allowed?
  const isEditable = slug === 'demo' || (canEdit(userRole?.role) && hasLock)

  // Track if we've set up save callback
  const saveCallbackSetRef = useRef(false)

  // ────────────────────────────────────────────────────────────────────────
  // AUTHENTICATION
  // ────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      try {
        // Demo mode
        if (slug === 'demo') {
          setLoading(false)
          return
        }

        // Check auth
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Check role
        const role = await getUserRole(slug)
        if (!role) {
          setError('You do not have access to this client')
          setLoading(false)
          return
        }

        if (!canEdit(role.role)) {
          setError('You do not have permission to edit this dashboard')
          setLoading(false)
          return
        }

        setUserRole(role)
        setLoading(false)
      } catch (err) {
        console.error('Init error:', err)
        setError('An unexpected error occurred')
        setLoading(false)
      }
    }

    init()
  }, [slug, router])

  // ────────────────────────────────────────────────────────────────────────
  // LOCK HANDLERS
  // ────────────────────────────────────────────────────────────────────────

  const handleAcquireLock = useCallback(async () => {
    const success = await acquireLock()
    if (success) {
      toast.success('You can now edit this dashboard')
    }
  }, [acquireLock])

  const handleOverrideLock = useCallback(async () => {
    const reason = window.prompt('Enter reason for overriding the lock:')
    if (!reason?.trim()) {
      toast.error('Please provide a reason')
      return
    }

    const success = await overrideLock(reason.trim())
    if (success) {
      toast.success('Lock overridden - you can now edit')
    }
  }, [overrideLock])

  // ────────────────────────────────────────────────────────────────────────
  // SAVE HANDLER
  // ────────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!bridge) return
    if (slug === 'demo') {
      toast.success('Demo mode: Changes not saved')
      return
    }

    if (!hasLock) {
      toast.error('You must acquire the edit lock before saving')
      return
    }

    setSaveStatus('saving')

    try {
      // Get all changes from the bridge
      const changes = await bridge.getAllChanges()

      if (changes.length === 0) {
        setSaveStatus('saved')
        toast.info('No changes to save')
        return
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Session expired. Please refresh the page.')
        setSaveStatus('error')
        return
      }

      // Save with retry
      let lastError: Error | null = null
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(`${API_BASE}/content-edits`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              clientSlug: slug,
              edits: changes.map(c => ({
                contentKey: c.key,
                editedValue: c.content,
                originalValue: c.original,
              })),
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP ${response.status}`)
          }

          // Success
          bridge.markSaved(changes.map(c => c.key))
          setSaveStatus('saved')
          toast.success(`Saved ${changes.length} change${changes.length > 1 ? 's' : ''}`)

          // Reset status after a delay
          setTimeout(() => setSaveStatus('idle'), 3000)
          return
        } catch (err) {
          lastError = err as Error
          console.error(`Save attempt ${attempt} failed:`, err)

          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, RETRY_DELAY * attempt))
          }
        }
      }

      // All retries failed
      console.error('Save failed after retries:', lastError)
      setSaveStatus('error')
      toast.error('Failed to save changes. Please try again.')
    } catch (err) {
      console.error('Save error:', err)
      setSaveStatus('error')
      toast.error('Failed to save changes')
    }
  }, [bridge, slug, hasLock])

  // ────────────────────────────────────────────────────────────────────────
  // BRIDGE READY HANDLER
  // ────────────────────────────────────────────────────────────────────────

  const handleBridgeReady = useCallback((readyBridge: UseWYSIWYGBridgeReturn) => {
    setBridge(readyBridge)

    // Set up save callback (only once)
    if (!saveCallbackSetRef.current) {
      saveCallbackSetRef.current = true
      readyBridge.onSaveRequested(() => {
        handleSave()
      })

      readyBridge.onNavigationBlocked((href) => {
        if (href) {
          toast.info('Navigation blocked while editing. Save your changes first.')
        }
      })
    }

    toast.success('Dashboard loaded')
  }, [handleSave])

  // Update bridge state to trigger re-renders when selection changes
  const handleBridgeStateChange = useCallback((updatedBridge: UseWYSIWYGBridgeReturn) => {
    setBridge(updatedBridge)
  }, [])

  // ────────────────────────────────────────────────────────────────────────
  // CONTENT CHANGE HANDLER
  // ────────────────────────────────────────────────────────────────────────

  const handleContentChange = useCallback(() => {
    // Reset save status when content changes
    if (saveStatus === 'saved') {
      setSaveStatus('idle')
    }
  }, [saveStatus])

  // ────────────────────────────────────────────────────────────────────────
  // KEYBOARD SHORTCUTS
  // ────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }

      // Cmd/Ctrl+Shift+A to toggle assets
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
        e.preventDefault()
        setShowAssets(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  // ────────────────────────────────────────────────────────────────────────
  // ASSET SELECTION HANDLER (for click-to-insert)
  // ────────────────────────────────────────────────────────────────────────

  const handleAssetSelect = useCallback((asset: Asset, url: string) => {
    // If an element is selected, insert the image there
    if (bridge?.state.selectedKey) {
      const imgHtml = `<img src="${url}" alt="${asset.filename}" style="max-width: 100%; height: auto;" />`
      bridge.insertMedia(bridge.state.selectedKey, imgHtml)
      toast.success('Image inserted')
      setShowAssets(false)
    } else {
      toast.info('Select an element first, then click an image to insert it')
    }
  }, [bridge])

  // ────────────────────────────────────────────────────────────────────────
  // EMBED INSERT HANDLER
  // ────────────────────────────────────────────────────────────────────────

  const handleEmbedInsert = useCallback((embedHtml: string) => {
    if (!bridge?.state.selectedKey) {
      toast.info('Select an element first, then insert an embed')
      return
    }

    bridge.insertMedia(bridge.state.selectedKey, embedHtml)
    setShowEmbedPanel(false)
  }, [bridge])

  // ────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy border-t-transparent mx-auto mb-4" />
          <p className="text-muted">Loading editor...</p>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────
  // ERROR STATE
  // ────────────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-bold text-navy mb-2">Access Denied</h1>
          <p className="text-muted mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-md hover:bg-navy-mid transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </Link>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ────────────────────────────────────────────────────────────────────────

  const hasChanges = bridge ? bridge.state.pendingChanges.size > 0 : false

  return (
    <div className="h-screen flex flex-col bg-cream">
      {/* Header */}
      <header className="flex-shrink-0 bg-navy text-white z-20">
        <div className="px-4 py-3 flex items-center justify-between">
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
            <div>
              <h1 className="font-display font-bold">
                {slug === 'demo' ? 'Demo Editor' : `Edit: ${slug}`}
              </h1>
              {slug === 'demo' && (
                <p className="text-xs text-mint/70">Changes won&apos;t be saved</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Lock indicator */}
            {slug !== 'demo' && userRole && (
              <LockIndicator
                hasLock={hasLock}
                lockOwner={lockOwner}
                lockExpiresAt={lockExpiresAt}
                isLoading={lockLoading}
                canOverride={canOverride}
                onAcquire={handleAcquireLock}
                onOverride={handleOverrideLock}
              />
            )}

            {/* Toggle assets */}
            <button
              onClick={() => setShowAssets(prev => !prev)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors
                ${showAssets ? 'bg-mint/20 text-mint' : 'bg-white/10 hover:bg-white/20'}
              `}
              title="Toggle Assets (Cmd+Shift+A)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Assets
            </button>

            {/* User role badge */}
            {userRole && (
              <span className="text-sm text-mint/70">{userRole.role}</span>
            )}
          </div>
        </div>
      </header>

      {/* Lock acquisition message */}
      {slug !== 'demo' && canEdit(userRole?.role) && !hasLock && !lockLoading && (
        <div className="flex-shrink-0 p-3 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-amber-800 flex-1">
              {lockOwner
                ? `This dashboard is being edited by ${lockOwner}. You can view but not edit.`
                : 'Click "Start Editing" to acquire the edit lock and make changes.'}
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {isEditable && (
        <EditorToolbar
          bridge={bridge}
          onSave={handleSave}
          saveStatus={saveStatus}
          hasChanges={hasChanges}
          onOpenAssetLibrary={() => setShowAssets(true)}
          onOpenEmbedPanel={() => setShowEmbedPanel(true)}
        />
      )}

      {/* Embed Panel */}
      <EmbedPanel
        isOpen={showEmbedPanel}
        onClose={() => setShowEmbedPanel(false)}
        onInsert={handleEmbedInsert}
      />

      {/* Asset Sidebar with drag-drop integration */}
      <ConnectedAssetSidebar
        clientSlug={slug}
        isOpen={showAssets}
        onClose={() => setShowAssets(false)}
        onAssetSelect={handleAssetSelect}
        bridge={bridge}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dashboard frame */}
        <div className="flex-1 overflow-hidden">
          <ErrorBoundary>
            <DashboardFrame
              clientSlug={slug}
              onBridgeReady={handleBridgeReady}
              onBridgeStateChange={handleBridgeStateChange}
              onError={(err) => setError(err)}
              className="w-full h-full"
            />
          </ErrorBoundary>
        </div>

      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// CONNECTED ASSET SIDEBAR
// Wraps AssetSidebar with DragDropProvider integration
// ──────────────────────────────────────────────────────────────────────────

interface ConnectedAssetSidebarProps {
  clientSlug: string
  isOpen: boolean
  onClose: () => void
  onAssetSelect: (asset: Asset, url: string) => void
  bridge: UseWYSIWYGBridgeReturn | null
}

function ConnectedAssetSidebar({
  clientSlug,
  isOpen,
  onClose,
  onAssetSelect,
  bridge,
}: ConnectedAssetSidebarProps) {
  // Handle drag start - store data and enable drop zones
  const handleDragStart = useCallback((asset: Asset, url: string) => {
    // Store the asset data for use when drop occurs
    (window as any).__lastDraggedAsset = {
      asset,
      url,
    }

    // Enable drop zones in the iframe
    bridge?.enableDropZones()
  }, [bridge])

  // Handle drag end - cleanup
  const handleDragEnd = useCallback(() => {
    (window as any).__lastDraggedAsset = null
    bridge?.disableDropZones()
  }, [bridge])

  // Set up media dropped callback to handle the drop into existing elements
  useEffect(() => {
    if (!bridge) return

    bridge.onMediaDropped((key, x, y) => {
      // Get the dragged asset data
      const dragData = (window as any).__lastDraggedAsset
      if (!dragData) {
        toast.error('Could not insert image. Please try again.')
        return
      }

      const { asset, url } = dragData as { asset: Asset; url: string }

      // Build and insert the image HTML
      const imgHtml = `<img src="${url}" alt="${asset.filename || 'Image'}" style="max-width: 100%; height: auto;" />`
      bridge.insertMedia(key, imgHtml)

      toast.success(`${asset.filename || 'Image'} inserted`)

      // Cleanup
      ;(window as any).__lastDraggedAsset = null
      bridge.disableDropZones()
    })
  }, [bridge])

  // Set up media insert between callback for dropping between elements
  useEffect(() => {
    if (!bridge) return

    bridge.onMediaInsertBetween((afterKey) => {
      // Get the dragged asset data
      const dragData = (window as any).__lastDraggedAsset
      if (!dragData) {
        toast.error('Could not insert image. Please try again.')
        return
      }

      const { asset, url } = dragData as { asset: Asset; url: string }

      // Generate a unique key for the new media block
      const newKey = `media-block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Build the image HTML
      const imgHtml = `<img src="${url}" alt="${asset.filename || 'Image'}" style="max-width: 100%; height: auto;" />`

      // Insert the media after the specified element
      bridge.insertMediaAfter(afterKey, imgHtml, newKey)

      toast.success(`${asset.filename || 'Image'} inserted between elements`)

      // Cleanup
      ;(window as any).__lastDraggedAsset = null
      bridge.disableDropZones()
    })
  }, [bridge])

  return (
    <AssetSidebar
      clientSlug={clientSlug}
      isOpen={isOpen}
      onClose={onClose}
      onAssetSelect={onAssetSelect}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    />
  )
}
