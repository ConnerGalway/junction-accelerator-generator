'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useWYSIWYGBridge, type UseWYSIWYGBridgeReturn } from '@/hooks/useWYSIWYGBridge'

interface DashboardFrameProps {
  clientSlug: string
  onBridgeReady?: (bridge: UseWYSIWYGBridgeReturn) => void
  onError?: (error: string) => void
  className?: string
}

export function DashboardFrame({
  clientSlug,
  onBridgeReady,
  onError,
  className = '',
}: DashboardFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const hasNotifiedRef = useRef(false)
  const hasConnectedRef = useRef(false)

  const bridge = useWYSIWYGBridge()

  // Build the dashboard URL with edit mode parameter
  const dashboardUrl = getDashboardUrl(clientSlug)

  // Connect bridge as soon as iframe element is available (before onLoad)
  // This ensures we can receive BRIDGE_LOADED messages from the script
  useEffect(() => {
    if (iframeRef.current && !hasConnectedRef.current) {
      hasConnectedRef.current = true
      bridge.connect(iframeRef.current)
    }
  }, [bridge])

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false)

    // Ensure bridge is connected (in case effect didn't run yet)
    if (iframeRef.current && !hasConnectedRef.current) {
      hasConnectedRef.current = true
      bridge.connect(iframeRef.current)
    }

    // Try to inject the bridge script (may fail for cross-origin)
    if (iframeRef.current) {
      injectBridgeScript(iframeRef.current)
    }
  }, [bridge])

  // Handle iframe error
  const handleIframeError = useCallback(() => {
    const error = 'Failed to load dashboard'
    setLoadError(error)
    setIsLoading(false)
    onError?.(error)
  }, [onError])

  // Notify parent when bridge is ready
  useEffect(() => {
    if (bridge.state.isReady && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true
      onBridgeReady?.(bridge)
    }
  }, [bridge.state.isReady, bridge, onBridgeReady])

  // Handle connection errors
  useEffect(() => {
    if (bridge.state.error) {
      setLoadError(bridge.state.error)
      onError?.(bridge.state.error)
    }
  }, [bridge.state.error, onError])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      bridge.disconnect()
    }
  }, [bridge])

  return (
    <div className={`dashboard-frame-container relative ${className}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-cream z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy border-t-transparent mx-auto mb-4" />
            <p className="text-muted">Loading dashboard...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-cream z-10">
          <div className="text-center max-w-md p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="font-display text-lg font-bold text-navy mb-2">
              Failed to load dashboard
            </h2>
            <p className="text-muted mb-4">{loadError}</p>
            <button
              onClick={() => {
                setLoadError(null)
                setIsLoading(true)
                if (iframeRef.current) {
                  iframeRef.current.src = dashboardUrl
                }
              }}
              className="px-4 py-2 bg-navy text-white rounded-md hover:bg-navy-mid transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Connecting indicator */}
      {!isLoading && !loadError && bridge.state.isConnecting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-50 text-amber-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent" />
          <span className="text-sm font-medium">Connecting editor...</span>
        </div>
      )}

      {/* The iframe */}
      <iframe
        ref={iframeRef}
        src={dashboardUrl}
        className="w-full h-full border-0"
        title={`Dashboard Editor - ${clientSlug}`}
        sandbox="allow-scripts allow-same-origin"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────────────────────────────────

function getDashboardUrl(clientSlug: string): string {
  // In development, use localhost
  // In production, use the accelerator domain
  const baseUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://accelerator.elearningu.com'

  // Add a query parameter to indicate edit mode
  // This prevents the dashboard from loading its normal auth flow
  return `${baseUrl}/${clientSlug}/?editor=true`
}

function injectBridgeScript(iframe: HTMLIFrameElement): void {
  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      console.error('Could not access iframe document')
      return
    }

    // Check if bridge is already injected
    if (iframeDoc.getElementById('editor-bridge-script')) {
      return
    }

    // Create script element
    const script = iframeDoc.createElement('script')
    script.id = 'editor-bridge-script'

    // In production, load from CDN or shared folder
    // In development, we can inline the script or load from local server
    const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_SCRIPT_URL || '/shared/editor-bridge.js'

    // For same-origin iframes, we can inject inline
    // For cross-origin, we need to load via script src
    if (isSameOrigin(iframe.src)) {
      // Inline injection would go here if needed
      script.src = bridgeUrl
    } else {
      script.src = bridgeUrl
    }

    script.async = true
    iframeDoc.body.appendChild(script)
  } catch (err) {
    // Cross-origin restrictions may prevent direct injection
    // In that case, the bridge script needs to be included in the dashboard HTML
    console.warn('Could not inject bridge script directly. Ensure it is included in the dashboard HTML.', err)
  }
}

function isSameOrigin(url: string): boolean {
  try {
    const urlObj = new URL(url, window.location.href)
    return urlObj.origin === window.location.origin
  } catch {
    return false
  }
}

// ──────────────────────────────────────────────────────────────────────────
// EXPORTS
// ──────────────────────────────────────────────────────────────────────────

export { type UseWYSIWYGBridgeReturn }
