'use client'

import { useState, useCallback } from 'react'
import type { UseWYSIWYGBridgeReturn } from '@/hooks/useWYSIWYGBridge'

interface EditorToolbarProps {
  bridge: UseWYSIWYGBridgeReturn | null
  onSave: () => Promise<void>
  onOpenAssetLibrary?: () => void
  onOpenEmbedPanel?: () => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  hasChanges: boolean
}

export function EditorToolbar({
  bridge,
  onSave,
  onOpenAssetLibrary,
  onOpenEmbedPanel,
  saveStatus,
  hasChanges,
}: EditorToolbarProps) {
  const [isSaving, setIsSaving] = useState(false)

  const selectedKey = bridge?.state.selectedKey
  const selectedType = bridge?.state.selectedType

  const handleSave = useCallback(async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      await onSave()
    } finally {
      setIsSaving(false)
    }
  }, [onSave, isSaving])

  const handleBold = useCallback(() => {
    if (!bridge || !selectedKey) return
    document.execCommand('bold', false)
  }, [bridge, selectedKey])

  const handleItalic = useCallback(() => {
    if (!bridge || !selectedKey) return
    document.execCommand('italic', false)
  }, [bridge, selectedKey])

  const handleUnderline = useCallback(() => {
    if (!bridge || !selectedKey) return
    document.execCommand('underline', false)
  }, [bridge, selectedKey])

  const handleLink = useCallback(() => {
    if (!bridge || !selectedKey) return
    const url = prompt('Enter link URL:')
    if (url) {
      document.execCommand('createLink', false, url)
    }
  }, [bridge, selectedKey])

  const canFormat = selectedType === 'text' && selectedKey

  return (
    <div className="editor-toolbar flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-200 shadow-sm">
      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!hasChanges || isSaving}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
          ${hasChanges
            ? 'bg-navy text-white hover:bg-navy-mid'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }
        `}
      >
        {isSaving ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <SaveIcon />
            <span>Save</span>
          </>
        )}
      </button>

      {/* Save status indicator */}
      <div className="flex items-center gap-1.5 text-sm">
        {saveStatus === 'saved' && (
          <span className="text-green-600 flex items-center gap-1">
            <CheckIcon />
            Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="text-red-600 flex items-center gap-1">
            <AlertIcon />
            Save failed
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200 mx-2" />

      {/* Text formatting */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={handleBold}
          disabled={!canFormat}
          title="Bold (Cmd+B)"
        >
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={handleItalic}
          disabled={!canFormat}
          title="Italic (Cmd+I)"
        >
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={handleUnderline}
          disabled={!canFormat}
          title="Underline (Cmd+U)"
        >
          <UnderlineIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={handleLink}
          disabled={!canFormat}
          title="Insert Link"
        >
          <LinkIcon />
        </ToolbarButton>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200 mx-2" />

      {/* Media insertion */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={onOpenAssetLibrary}
          title="Insert Image"
        >
          <ImageIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={onOpenEmbedPanel}
          title="Insert Embed (Video, etc.)"
        >
          <VideoIcon />
        </ToolbarButton>
      </div>

      {/* Right side - selection info */}
      <div className="ml-auto flex items-center gap-3">
        {selectedKey && (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono">
              {selectedKey}
            </span>
            <span className="text-xs uppercase tracking-wide text-slate-400">
              {selectedType}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// TOOLBAR BUTTON
// ──────────────────────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  title?: string
  children: React.ReactNode
}

function ToolbarButton({
  onClick,
  disabled = false,
  active = false,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded-md transition-colors
        ${disabled
          ? 'text-slate-300 cursor-not-allowed'
          : active
            ? 'bg-navy text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }
      `}
    >
      {children}
    </button>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// ICONS
// ──────────────────────────────────────────────────────────────────────────

function SaveIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function BoldIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
    </svg>
  )
}

function ItalicIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m4 16h-4M15 4L9 20" />
    </svg>
  )
}

function UnderlineIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v8a5 5 0 0010 0V4M5 20h14" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}
