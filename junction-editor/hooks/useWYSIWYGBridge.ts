'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ──────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────

export interface EditableElement {
  key: string
  type: 'text' | 'link' | 'image' | 'image-container'
  content: string
  path: string
  tagName: string
}

export interface ContentChange {
  key: string
  content: string
  original?: string
}

export interface BridgeState {
  isReady: boolean
  isConnecting: boolean
  error: string | null
  elements: EditableElement[]
  selectedKey: string | null
  selectedContent: string | null
  selectedType: string | null
  selectedPath: string | null
  pendingChanges: Map<string, ContentChange>
  clientSlug: string | null
}

// Commands sent from parent to iframe
export type BridgeCommand =
  | { type: 'INIT' }
  | { type: 'SELECT_ELEMENT'; key: string }
  | { type: 'HIGHLIGHT_ELEMENT'; key: string; highlight?: boolean }
  | { type: 'SET_CONTENT'; key: string; content: string }
  | { type: 'INSERT_MEDIA'; key: string; html: string }
  | { type: 'ENABLE_DROP_ZONES' }
  | { type: 'DISABLE_DROP_ZONES' }
  | { type: 'SCROLL_TO_ELEMENT'; key: string }
  | { type: 'GET_CONTENT'; key: string }
  | { type: 'GET_ALL_CHANGES' }
  | { type: 'MARK_SAVED'; keys: string[] }
  | { type: 'CLEAR_SELECTION' }

// Events received from iframe
export type BridgeEvent =
  | { type: 'BRIDGE_LOADED' }
  | { type: 'READY'; elements: EditableElement[]; clientSlug: string }
  | { type: 'ELEMENT_SELECTED'; key: string; content: string; elementType: string; path: string }
  | { type: 'CONTENT_CHANGED'; key: string; content: string }
  | { type: 'DROP_ZONE_ENTER'; key: string }
  | { type: 'DROP_ZONE_LEAVE'; key: string }
  | { type: 'MEDIA_DROPPED'; key: string; x: number; y: number }
  | { type: 'SAVE_REQUESTED' }
  | { type: 'SELECTION_CLEARED' }
  | { type: 'NAVIGATION_BLOCKED'; href?: string }
  | { type: 'CONTENT_RESPONSE'; key: string; content: string }
  | { type: 'ALL_CHANGES_RESPONSE'; changes: ContentChange[] }

export interface UseWYSIWYGBridgeReturn {
  // State
  state: BridgeState

  // Connection
  connect: (iframe: HTMLIFrameElement) => void
  disconnect: () => void

  // Element operations
  selectElement: (key: string) => void
  highlightElement: (key: string, highlight?: boolean) => void
  clearSelection: () => void
  scrollToElement: (key: string) => void

  // Content operations
  setContent: (key: string, content: string) => void
  insertMedia: (key: string, html: string) => void
  getContent: (key: string) => Promise<string | null>
  getAllChanges: () => Promise<ContentChange[]>
  markSaved: (keys: string[]) => void

  // Drop zones
  enableDropZones: () => void
  disableDropZones: () => void

  // Events
  onSaveRequested: (callback: () => void) => void
  onMediaDropped: (callback: (key: string, x: number, y: number) => void) => void
  onNavigationBlocked: (callback: (href?: string) => void) => void
}

// ──────────────────────────────────────────────────────────────────────────
// HOOK
// ──────────────────────────────────────────────────────────────────────────

export function useWYSIWYGBridge(): UseWYSIWYGBridgeReturn {
  const [state, setState] = useState<BridgeState>({
    isReady: false,
    isConnecting: false,
    error: null,
    elements: [],
    selectedKey: null,
    selectedContent: null,
    selectedType: null,
    selectedPath: null,
    pendingChanges: new Map(),
    clientSlug: null,
  })

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const bridgeWindowRef = useRef<Window | null>(null) // Store the bridge's window for verification
  const mountedRef = useRef(true)
  const messageQueueRef = useRef<BridgeCommand[]>([])

  // Callbacks
  const saveRequestedCallbackRef = useRef<(() => void) | null>(null)
  const mediaDroppedCallbackRef = useRef<((key: string, x: number, y: number) => void) | null>(null)
  const navigationBlockedCallbackRef = useRef<((href?: string) => void) | null>(null)

  // Promise resolvers for async operations
  const contentResolversRef = useRef<Map<string, (content: string | null) => void>>(new Map())
  const changesResolverRef = useRef<((changes: ContentChange[]) => void) | null>(null)

  // ────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ────────────────────────────────────────────────────────────────────────

  const safeSetState = useCallback((updater: (prev: BridgeState) => BridgeState) => {
    if (mountedRef.current) {
      setState(updater)
    }
  }, [])

  const sendCommand = useCallback((command: BridgeCommand) => {
    // Use either the iframe contentWindow or the stored bridge window
    const targetWindow = iframeRef.current?.contentWindow || bridgeWindowRef.current

    if (!targetWindow) {
      // Queue command for when connection is ready
      messageQueueRef.current.push(command)
      return
    }

    if (!state.isReady && command.type !== 'INIT') {
      // Queue command until ready
      messageQueueRef.current.push(command)
      return
    }

    try {
      targetWindow.postMessage(command, '*')
    } catch (err) {
      console.error('Failed to send command to bridge:', err)
    }
  }, [state.isReady])

  const flushMessageQueue = useCallback(() => {
    const targetWindow = iframeRef.current?.contentWindow || bridgeWindowRef.current
    if (!targetWindow) return

    const queue = messageQueueRef.current
    messageQueueRef.current = []

    queue.forEach(command => {
      try {
        targetWindow.postMessage(command, '*')
      } catch (err) {
        console.error('Failed to send queued command:', err)
      }
    })
  }, [])

  // ────────────────────────────────────────────────────────────────────────
  // MESSAGE HANDLER
  // ────────────────────────────────────────────────────────────────────────

  const handleMessage = useCallback((event: MessageEvent) => {
    const data = event.data as BridgeEvent & { source?: string }

    // Check for bridge source identifier first
    if (data.source !== 'editor-bridge') {
      return
    }

    // Verify the message source
    // First check if it's from our known bridge window
    // Then check if it's from our iframe's contentWindow
    // For BRIDGE_LOADED, we'll also accept the first message and store the window
    const isFromBridge = bridgeWindowRef.current && event.source === bridgeWindowRef.current
    const isFromIframe = iframeRef.current && event.source === iframeRef.current.contentWindow

    if (data.type === 'BRIDGE_LOADED') {
      // Store the bridge window for future verification
      if (event.source && !bridgeWindowRef.current) {
        bridgeWindowRef.current = event.source as Window
        console.log('[WYSIWYG Bridge] Bridge connected, sending INIT')

        // Send INIT directly to the bridge window
        try {
          bridgeWindowRef.current.postMessage({ type: 'INIT' }, '*')
        } catch (err) {
          console.warn('[WYSIWYG Bridge] Failed to send INIT:', err)
        }
      }
      return
    }

    // For other messages, verify they're from the bridge
    if (!isFromBridge && !isFromIframe) {
      return
    }

    switch (data.type) {

      case 'READY':
        safeSetState(prev => ({
          ...prev,
          isReady: true,
          isConnecting: false,
          error: null,
          elements: data.elements,
          clientSlug: data.clientSlug,
        }))
        // Flush any queued commands
        flushMessageQueue()
        break

      case 'ELEMENT_SELECTED':
        safeSetState(prev => ({
          ...prev,
          selectedKey: data.key,
          selectedContent: data.content,
          selectedType: data.elementType,
          selectedPath: data.path,
        }))
        break

      case 'CONTENT_CHANGED':
        safeSetState(prev => {
          const newChanges = new Map(prev.pendingChanges)
          const existing = newChanges.get(data.key)
          newChanges.set(data.key, {
            key: data.key,
            content: data.content,
            original: existing?.original,
          })
          return {
            ...prev,
            pendingChanges: newChanges,
            // Update selected content if this is the selected element
            selectedContent: prev.selectedKey === data.key ? data.content : prev.selectedContent,
          }
        })
        break

      case 'SELECTION_CLEARED':
        safeSetState(prev => ({
          ...prev,
          selectedKey: null,
          selectedContent: null,
          selectedType: null,
          selectedPath: null,
        }))
        break

      case 'SAVE_REQUESTED':
        saveRequestedCallbackRef.current?.()
        break

      case 'MEDIA_DROPPED':
        mediaDroppedCallbackRef.current?.(data.key, data.x, data.y)
        break

      case 'NAVIGATION_BLOCKED':
        navigationBlockedCallbackRef.current?.(data.href)
        break

      case 'CONTENT_RESPONSE':
        const contentResolver = contentResolversRef.current.get(data.key)
        if (contentResolver) {
          contentResolver(data.content)
          contentResolversRef.current.delete(data.key)
        }
        break

      case 'ALL_CHANGES_RESPONSE':
        changesResolverRef.current?.(data.changes)
        changesResolverRef.current = null
        break

      case 'DROP_ZONE_ENTER':
      case 'DROP_ZONE_LEAVE':
        // Could add hover state tracking here if needed
        break
    }
  }, [safeSetState, sendCommand, flushMessageQueue])

  // ────────────────────────────────────────────────────────────────────────
  // CONNECTION
  // ────────────────────────────────────────────────────────────────────────

  const connect = useCallback((iframe: HTMLIFrameElement) => {
    iframeRef.current = iframe

    safeSetState(prev => ({
      ...prev,
      isConnecting: true,
      error: null,
    }))

    // The iframe will send BRIDGE_LOADED when the script is ready
    // We listen for that and then send INIT
  }, [safeSetState])

  const disconnect = useCallback(() => {
    iframeRef.current = null
    bridgeWindowRef.current = null
    messageQueueRef.current = []
    contentResolversRef.current.clear()
    changesResolverRef.current = null

    safeSetState(() => ({
      isReady: false,
      isConnecting: false,
      error: null,
      elements: [],
      selectedKey: null,
      selectedContent: null,
      selectedType: null,
      selectedPath: null,
      pendingChanges: new Map(),
      clientSlug: null,
    }))
  }, [safeSetState])

  // ────────────────────────────────────────────────────────────────────────
  // ELEMENT OPERATIONS
  // ────────────────────────────────────────────────────────────────────────

  const selectElement = useCallback((key: string) => {
    sendCommand({ type: 'SELECT_ELEMENT', key })
  }, [sendCommand])

  const highlightElement = useCallback((key: string, highlight = true) => {
    sendCommand({ type: 'HIGHLIGHT_ELEMENT', key, highlight })
  }, [sendCommand])

  const clearSelection = useCallback(() => {
    sendCommand({ type: 'CLEAR_SELECTION' })
    safeSetState(prev => ({
      ...prev,
      selectedKey: null,
      selectedContent: null,
      selectedType: null,
      selectedPath: null,
    }))
  }, [sendCommand, safeSetState])

  const scrollToElement = useCallback((key: string) => {
    sendCommand({ type: 'SCROLL_TO_ELEMENT', key })
  }, [sendCommand])

  // ────────────────────────────────────────────────────────────────────────
  // CONTENT OPERATIONS
  // ────────────────────────────────────────────────────────────────────────

  const setContent = useCallback((key: string, content: string) => {
    sendCommand({ type: 'SET_CONTENT', key, content })

    // Also update local state
    safeSetState(prev => {
      const newChanges = new Map(prev.pendingChanges)
      const existing = newChanges.get(key)
      newChanges.set(key, {
        key,
        content,
        original: existing?.original,
      })
      return {
        ...prev,
        pendingChanges: newChanges,
        selectedContent: prev.selectedKey === key ? content : prev.selectedContent,
      }
    })
  }, [sendCommand, safeSetState])

  const insertMedia = useCallback((key: string, html: string) => {
    sendCommand({ type: 'INSERT_MEDIA', key, html })
  }, [sendCommand])

  const getContent = useCallback((key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      contentResolversRef.current.set(key, resolve)
      sendCommand({ type: 'GET_CONTENT', key })

      // Timeout after 5 seconds
      setTimeout(() => {
        if (contentResolversRef.current.has(key)) {
          contentResolversRef.current.delete(key)
          resolve(null)
        }
      }, 5000)
    })
  }, [sendCommand])

  const getAllChanges = useCallback((): Promise<ContentChange[]> => {
    return new Promise((resolve) => {
      changesResolverRef.current = resolve
      sendCommand({ type: 'GET_ALL_CHANGES' })

      // Timeout after 5 seconds
      setTimeout(() => {
        if (changesResolverRef.current) {
          changesResolverRef.current([])
          changesResolverRef.current = null
        }
      }, 5000)
    })
  }, [sendCommand])

  const markSaved = useCallback((keys: string[]) => {
    sendCommand({ type: 'MARK_SAVED', keys })

    // Clear from local pending changes
    safeSetState(prev => {
      const newChanges = new Map(prev.pendingChanges)
      keys.forEach(key => newChanges.delete(key))
      return {
        ...prev,
        pendingChanges: newChanges,
      }
    })
  }, [sendCommand, safeSetState])

  // ────────────────────────────────────────────────────────────────────────
  // DROP ZONES
  // ────────────────────────────────────────────────────────────────────────

  const enableDropZones = useCallback(() => {
    sendCommand({ type: 'ENABLE_DROP_ZONES' })
  }, [sendCommand])

  const disableDropZones = useCallback(() => {
    sendCommand({ type: 'DISABLE_DROP_ZONES' })
  }, [sendCommand])

  // ────────────────────────────────────────────────────────────────────────
  // EVENT CALLBACKS
  // ────────────────────────────────────────────────────────────────────────

  const onSaveRequested = useCallback((callback: () => void) => {
    saveRequestedCallbackRef.current = callback
  }, [])

  const onMediaDropped = useCallback((callback: (key: string, x: number, y: number) => void) => {
    mediaDroppedCallbackRef.current = callback
  }, [])

  const onNavigationBlocked = useCallback((callback: (href?: string) => void) => {
    navigationBlockedCallbackRef.current = callback
  }, [])

  // ────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ────────────────────────────────────────────────────────────────────────

  // Set up message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [handleMessage])

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  // ────────────────────────────────────────────────────────────────────────
  // RETURN
  // ────────────────────────────────────────────────────────────────────────

  return {
    state,
    connect,
    disconnect,
    selectElement,
    highlightElement,
    clearSelection,
    scrollToElement,
    setContent,
    insertMedia,
    getContent,
    getAllChanges,
    markSaved,
    enableDropZones,
    disableDropZones,
    onSaveRequested,
    onMediaDropped,
    onNavigationBlocked,
  }
}
