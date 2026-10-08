'use client'

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { TipTapContent } from '@/lib/supabase'
import { debounce } from '@/lib/editor-utils'
import { Toolbar } from './Toolbar'
import { BlockMenu } from './BlockMenu'
import { ImageUploadPanel } from './ImageUploadPanel'
import { BlockActions } from './BlockActions'
import { Tooltip } from '@/components/ui'

interface EditorProps {
  initialContent: TipTapContent
  clientSlug: string
  readOnly?: boolean
  onSave?: (content: TipTapContent) => Promise<void>
  onContentChange?: (content: TipTapContent) => void
}

export function Editor({
  initialContent,
  clientSlug,
  readOnly = false,
  onSave,
  onContentChange,
}: EditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showImagePanel, setShowImagePanel] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your implementation plan...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: initialContent,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-lg max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const content = editor.getJSON() as TipTapContent
      setHasUnsavedChanges(true)
      onContentChange?.(content)
      debouncedSave(content)
    },
  })

  // Debounced autosave (2 seconds after last change)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce(async (content: TipTapContent) => {
      if (!onSave || readOnly) return

      setIsSaving(true)
      try {
        await onSave(content)
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
      } catch (error) {
        console.error('Autosave failed:', error)
        toast.error('Failed to save changes')
      } finally {
        setIsSaving(false)
      }
    }, 2000),
    [onSave, readOnly]
  )

  // Manual save function
  const handleManualSave = useCallback(async () => {
    if (!editor || !onSave || readOnly) return

    const content = editor.getJSON() as TipTapContent
    setIsSaving(true)
    try {
      await onSave(content)
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
      toast.success('Changes saved')
    } catch (error) {
      console.error('Save failed:', error)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }, [editor, onSave, readOnly])

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleManualSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleManualSave])

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Handle image insertion from panel
  const handleImageSelect = useCallback((url: string, alt?: string) => {
    if (!editor) return
    editor.chain().focus().setImage({ src: url, alt: alt || '' }).run()
    setShowImagePanel(false)
  }, [editor])

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-navy border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="editor-wrapper">
      {/* Toolbar */}
      {!readOnly && (
        <Toolbar
          editor={editor}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          lastSaved={lastSaved}
          onSave={handleManualSave}
          onInsertImage={() => setShowImagePanel(true)}
        />
      )}

      {/* Block Menu (floating add button) */}
      {!readOnly && <BlockMenu editor={editor} onInsertImage={() => setShowImagePanel(true)} />}

      {/* Image Upload Panel */}
      {showImagePanel && (
        <ImageUploadPanel
          clientSlug={clientSlug}
          onSelect={handleImageSelect}
          onClose={() => setShowImagePanel(false)}
        />
      )}

      {/* Bubble Menu (appears on text selection) */}
      {!readOnly && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="flex items-center gap-1 bg-navy rounded-lg p-1 shadow-dropdown"
        >
          <Tooltip content="Bold - Make text stronger (⌘B)" position="top">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-white/10 transition-colors ${
                editor.isActive('bold') ? 'text-mint' : 'text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip content="Italic - Emphasize text (⌘I)" position="top">
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-white/10 transition-colors ${
                editor.isActive('italic') ? 'text-mint' : 'text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0v16m-4 0h8" transform="skewX(-10)" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip content="Underline - Draw line under text (⌘U)" position="top">
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-white/10 transition-colors ${
                editor.isActive('underline') ? 'text-mint' : 'text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8v4a5 5 0 0010 0V8M5 20h14" />
              </svg>
            </button>
          </Tooltip>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <Tooltip content="Add Link - Insert a clickable URL" position="top">
            <button
              onClick={() => {
                const url = window.prompt('Enter URL:')
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run()
                }
              }}
              className={`p-2 rounded hover:bg-white/10 transition-colors ${
                editor.isActive('link') ? 'text-mint' : 'text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
          </Tooltip>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <Tooltip content="Delete Block - Remove this content block" position="top">
            <button
              onClick={() => {
                const { from } = editor.state.selection
                const resolvedPos = editor.state.doc.resolve(from)
                let depth = resolvedPos.depth
                while (depth > 0 && !resolvedPos.node(depth).type.isBlock) {
                  depth--
                }
                if (depth > 0) {
                  const start = resolvedPos.before(depth)
                  const end = resolvedPos.after(depth)
                  editor.chain().focus().deleteRange({ from: start, to: end }).run()
                }
              }}
              className="p-2 rounded hover:bg-red-500/20 text-white hover:text-red-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </Tooltip>
        </BubbleMenu>
      )}

      {/* Editor Content */}
      <div className="relative bg-white rounded-lg border border-navy/10 shadow-card p-8 min-h-[500px]">
        {!readOnly && <BlockActions editor={editor} />}
        <EditorContent editor={editor} />
      </div>

      {/* Status Bar */}
      {!readOnly && (
        <div className="flex items-center justify-between mt-4 text-xs text-muted">
          <div className="flex items-center gap-4">
            <span>
              {editor.storage.characterCount?.words?.() || 0} words
            </span>
            <span>
              {editor.storage.characterCount?.characters?.() || 0} characters
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border border-muted border-t-transparent" />
                Saving...
              </span>
            )}
            {!isSaving && hasUnsavedChanges && (
              <span className="text-amber-600">Unsaved changes</span>
            )}
            {!isSaving && !hasUnsavedChanges && lastSaved && (
              <span className="text-green-600">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
