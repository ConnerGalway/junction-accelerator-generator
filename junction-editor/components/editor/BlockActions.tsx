'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { Tooltip } from '@/components/ui'

interface BlockActionsProps {
  editor: Editor
}

export function BlockActions({ editor }: BlockActionsProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Get the current block element and position the menu
  const updatePosition = useCallback(() => {
    if (!editor || editor.state.selection.empty) {
      setIsVisible(false)
      return
    }

    const { from } = editor.state.selection
    const resolvedPos = editor.state.doc.resolve(from)

    // Find the closest block-level node
    let depth = resolvedPos.depth
    while (depth > 0 && !resolvedPos.node(depth).type.isBlock) {
      depth--
    }

    if (depth === 0) {
      setIsVisible(false)
      return
    }

    // Get DOM element for this node
    const domNode = editor.view.domAtPos(resolvedPos.before(depth))
    const element = domNode.node as HTMLElement

    if (element && element.getBoundingClientRect) {
      const rect = element.getBoundingClientRect()
      const editorRect = editor.view.dom.getBoundingClientRect()

      setPosition({
        top: rect.top - editorRect.top,
        left: -48, // Position to the left of the content
      })
      setIsVisible(true)
    }
  }, [editor])

  // Update position on selection change
  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      updatePosition()
    }

    editor.on('selectionUpdate', handleSelectionUpdate)
    editor.on('focus', handleSelectionUpdate)
    editor.on('blur', () => setIsVisible(false))

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      editor.off('focus', handleSelectionUpdate)
      editor.off('blur', () => setIsVisible(false))
    }
  }, [editor, updatePosition])

  // Delete the current block
  const handleDelete = useCallback(() => {
    if (!editor) return

    const { from } = editor.state.selection
    const resolvedPos = editor.state.doc.resolve(from)

    // Find the closest block-level node
    let depth = resolvedPos.depth
    while (depth > 0 && !resolvedPos.node(depth).type.isBlock) {
      depth--
    }

    if (depth === 0) return

    const start = resolvedPos.before(depth)
    const end = resolvedPos.after(depth)

    editor.chain()
      .focus()
      .deleteRange({ from: start, to: end })
      .run()

    setIsVisible(false)
  }, [editor])

  // Duplicate the current block
  const handleDuplicate = useCallback(() => {
    if (!editor) return

    const { from } = editor.state.selection
    const resolvedPos = editor.state.doc.resolve(from)

    let depth = resolvedPos.depth
    while (depth > 0 && !resolvedPos.node(depth).type.isBlock) {
      depth--
    }

    if (depth === 0) return

    const node = resolvedPos.node(depth)
    const end = resolvedPos.after(depth)

    editor.chain()
      .focus()
      .insertContentAt(end, node.toJSON())
      .run()
  }, [editor])

  // Move block up
  const handleMoveUp = useCallback(() => {
    if (!editor) return
    // TipTap doesn't have built-in moveUp, but we can use liftListItem for lists
    // For general blocks, we'd need more complex logic
    editor.chain().focus().run()
  }, [editor])

  if (!isVisible || !position) return null

  return (
    <div
      ref={menuRef}
      className="absolute z-10 flex flex-col gap-1 p-1 bg-white rounded-lg border border-navy/10 shadow-lg animate-fade-in"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <Tooltip content="Delete block" position="left">
        <button
          onClick={handleDelete}
          className="p-1.5 rounded hover:bg-red-50 text-muted hover:text-red-600 transition-colors"
          aria-label="Delete block"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content="Duplicate block" position="left">
        <button
          onClick={handleDuplicate}
          className="p-1.5 rounded hover:bg-mint/20 text-muted hover:text-navy transition-colors"
          aria-label="Duplicate block"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </Tooltip>
    </div>
  )
}
