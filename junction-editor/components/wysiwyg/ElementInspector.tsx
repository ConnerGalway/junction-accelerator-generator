'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UseWYSIWYGBridgeReturn, EditableElement } from '@/hooks/useWYSIWYGBridge'

interface ElementInspectorProps {
  bridge: UseWYSIWYGBridgeReturn | null
  onContentChange?: (key: string, content: string) => void
}

export function ElementInspector({
  bridge,
  onContentChange,
}: ElementInspectorProps) {
  const [localContent, setLocalContent] = useState('')
  const [linkText, setLinkText] = useState('')
  const [linkHref, setLinkHref] = useState('')

  const selectedKey = bridge?.state.selectedKey
  const selectedContent = bridge?.state.selectedContent
  const selectedType = bridge?.state.selectedType
  const selectedPath = bridge?.state.selectedPath
  const elements = bridge?.state.elements || []

  // Update local state when selection changes
  useEffect(() => {
    if (selectedContent) {
      if (selectedType === 'link') {
        try {
          const { text, href } = JSON.parse(selectedContent)
          setLinkText(text || '')
          setLinkHref(href || '')
        } catch {
          setLinkText(selectedContent)
          setLinkHref('')
        }
      } else {
        setLocalContent(selectedContent)
      }
    } else {
      setLocalContent('')
      setLinkText('')
      setLinkHref('')
    }
  }, [selectedContent, selectedType])

  // Handle text content change
  const handleContentChange = useCallback((value: string) => {
    setLocalContent(value)
    if (bridge && selectedKey) {
      bridge.setContent(selectedKey, value)
      onContentChange?.(selectedKey, value)
    }
  }, [bridge, selectedKey, onContentChange])

  // Handle link content change
  const handleLinkChange = useCallback((text: string, href: string) => {
    setLinkText(text)
    setLinkHref(href)
    if (bridge && selectedKey) {
      const content = JSON.stringify({ text, href })
      bridge.setContent(selectedKey, content)
      onContentChange?.(selectedKey, content)
    }
  }, [bridge, selectedKey, onContentChange])

  // Handle element click from list
  const handleElementClick = useCallback((key: string) => {
    console.log('[ElementInspector] Element clicked:', key, 'bridge:', !!bridge, 'isReady:', bridge?.state.isReady)
    if (!bridge) {
      console.warn('[ElementInspector] No bridge available')
      return
    }
    bridge.selectElement(key)
    bridge.scrollToElement(key)
  }, [bridge])

  // Clear selection
  const handleClearSelection = useCallback(() => {
    bridge?.clearSelection()
  }, [bridge])

  // Copy key to clipboard
  const handleCopyKey = useCallback(() => {
    if (selectedKey) {
      navigator.clipboard.writeText(selectedKey)
    }
  }, [selectedKey])

  return (
    <div className="element-inspector flex flex-col h-full bg-white border-l border-slate-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="font-display font-bold text-navy">Element Inspector</h2>
      </div>

      {/* Selected element details */}
      {selectedKey ? (
        <div className="flex-1 overflow-y-auto">
          {/* Selection info */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide text-slate-500 font-medium">
                Selected Element
              </span>
              <button
                onClick={handleClearSelection}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-navy bg-white px-2 py-1 rounded border border-slate-200 flex-1 truncate">
                {selectedKey}
              </code>
              <button
                onClick={handleCopyKey}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                title="Copy key"
              >
                <CopyIcon />
              </button>
            </div>
            {selectedPath && (
              <p className="text-xs text-slate-400 mt-2 truncate" title={selectedPath}>
                {selectedPath}
              </p>
            )}
          </div>

          {/* Content editor */}
          <div className="px-4 py-3">
            <label className="block text-xs uppercase tracking-wide text-slate-500 font-medium mb-2">
              {selectedType === 'link' ? 'Link Properties' : 'Content'}
            </label>

            {selectedType === 'link' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Text</label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => handleLinkChange(e.target.value, linkHref)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    placeholder="Link text"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">URL</label>
                  <input
                    type="url"
                    value={linkHref}
                    onChange={(e) => handleLinkChange(linkText, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy font-mono text-xs"
                    placeholder="https://..."
                  />
                </div>
              </div>
            ) : (
              <textarea
                value={localContent}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full h-48 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-none"
                placeholder="Enter content..."
              />
            )}

            <p className="text-xs text-slate-400 mt-2">
              Changes are applied in real-time to the dashboard preview.
            </p>
          </div>

          {/* Type indicator */}
          <div className="px-4 py-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-500">Type:</span>
              <span className={`
                text-xs px-2 py-0.5 rounded-full font-medium
                ${selectedType === 'text' ? 'bg-blue-100 text-blue-700' : ''}
                ${selectedType === 'link' ? 'bg-purple-100 text-purple-700' : ''}
                ${selectedType === 'image' ? 'bg-green-100 text-green-700' : ''}
              `}>
                {selectedType}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Element list when nothing selected */
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm text-slate-500">
              Click an element in the dashboard to select it, or choose from the list below.
            </p>
          </div>

          <div className="px-2 py-2">
            <ElementList elements={elements} onElementClick={handleElementClick} />
          </div>
        </div>
      )}

      {/* Footer with stats */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{elements.length} editable elements</span>
          {bridge?.state.pendingChanges.size ? (
            <span className="text-amber-600 font-medium">
              {bridge.state.pendingChanges.size} unsaved changes
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// ELEMENT LIST
// ──────────────────────────────────────────────────────────────────────────

interface ElementListProps {
  elements: EditableElement[]
  onElementClick: (key: string) => void
}

function ElementList({ elements, onElementClick }: ElementListProps) {
  // Group elements by page/section
  const grouped = groupElementsByPath(elements)

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          <div className="px-2 py-1 text-xs uppercase tracking-wide text-slate-400 font-medium">
            {group}
          </div>
          <div className="space-y-0.5">
            {items.map((el) => (
              <button
                key={el.key}
                onClick={() => onElementClick(el.key)}
                className="w-full px-2 py-1.5 text-left text-sm rounded hover:bg-slate-100 transition-colors flex items-center gap-2"
              >
                <TypeBadge type={el.type} />
                <span className="truncate text-slate-700">{el.key}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function groupElementsByPath(elements: EditableElement[]): Record<string, EditableElement[]> {
  const groups: Record<string, EditableElement[]> = {}

  elements.forEach((el) => {
    const parts = el.path.split(' > ')
    const group = parts[0] || 'Other'

    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(el)
  })

  return groups
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    text: 'bg-blue-100 text-blue-600',
    link: 'bg-purple-100 text-purple-600',
    image: 'bg-green-100 text-green-600',
    'image-container': 'bg-green-100 text-green-600',
  }

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${colors[type] || 'bg-slate-100 text-slate-600'}`}>
      {type === 'image-container' ? 'img' : type.substring(0, 4)}
    </span>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// ICONS
// ──────────────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}
