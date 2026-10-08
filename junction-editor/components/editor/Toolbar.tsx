'use client'

import type { Editor } from '@tiptap/react'
import { formatRelativeTime } from '@/lib/editor-utils'
import { Tooltip } from '@/components/ui'

interface ToolbarProps {
  editor: Editor
  isSaving: boolean
  hasUnsavedChanges: boolean
  lastSaved: Date | null
  onSave: () => void
  onInsertImage: () => void
}

export function Toolbar({
  editor,
  isSaving,
  hasUnsavedChanges,
  lastSaved,
  onSave,
  onInsertImage,
}: ToolbarProps) {
  return (
    <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur border-b border-navy/10 -mx-8 px-8 py-3 mb-6">
      <div className="flex items-center gap-1 flex-wrap">
        {/* Text Style Group */}
        <div className="flex items-center gap-1 mr-2">
          <Tooltip content="Change text style - paragraphs and headings">
            <select
              value={
                editor.isActive('heading', { level: 1 }) ? '1' :
                editor.isActive('heading', { level: 2 }) ? '2' :
                editor.isActive('heading', { level: 3 }) ? '3' :
                editor.isActive('heading', { level: 4 }) ? '4' :
                'p'
              }
              onChange={(e) => {
                const value = e.target.value
                if (value === 'p') {
                  editor.chain().focus().setParagraph().run()
                } else {
                  editor.chain().focus().toggleHeading({ level: parseInt(value) as 1 | 2 | 3 | 4 }).run()
                }
              }}
              className="h-9 px-3 rounded-md border border-navy/15 bg-white text-sm font-medium text-navy focus:outline-none focus:ring-2 focus:ring-navy/20 cursor-pointer"
            >
              <option value="p">Paragraph</option>
              <option value="1">Heading 1</option>
              <option value="2">Heading 2</option>
              <option value="3">Heading 3</option>
              <option value="4">Heading 4</option>
            </select>
          </Tooltip>
        </div>

        <div className="w-px h-6 bg-navy/10 mx-2" />

        {/* Format Group */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            tooltip="Bold - Make text stronger (⌘B)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            tooltip="Italic - Emphasize text (⌘I)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 4h-9m4 16H5M15 4L9 20" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            tooltip="Underline - Draw a line under text (⌘U)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8v4a5 5 0 0010 0V8M5 20h14" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            tooltip="Strikethrough - Cross out text"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v3m0 4.5V21M5 12h14" />
            </svg>
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-navy/10 mx-2" />

        {/* List Group */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            tooltip="Bullet List - Create an unordered list"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              <circle cx="2" cy="6" r="1" fill="currentColor" />
              <circle cx="2" cy="12" r="1" fill="currentColor" />
              <circle cx="2" cy="18" r="1" fill="currentColor" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            tooltip="Numbered List - Create a numbered list"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13" />
              <text x="2" y="8" fontSize="6" fill="currentColor" fontWeight="bold">1</text>
              <text x="2" y="14" fontSize="6" fill="currentColor" fontWeight="bold">2</text>
              <text x="2" y="20" fontSize="6" fill="currentColor" fontWeight="bold">3</text>
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            tooltip="Quote - Add a blockquote for emphasis"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-navy/10 mx-2" />

        {/* Alignment Group */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            tooltip="Align Left - Align text to the left"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            tooltip="Align Center - Center the text"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            tooltip="Align Right - Align text to the right"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
            </svg>
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-navy/10 mx-2" />

        {/* Insert Group */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={onInsertImage}
            tooltip="Insert Image - Add an image from upload, library, or URL"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => {
              const url = window.prompt('Enter link URL:')
              if (url) {
                editor.chain().focus().setLink({ href: url }).run()
              }
            }}
            isActive={editor.isActive('link')}
            tooltip="Insert Link - Add a clickable hyperlink"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            tooltip="Insert Table - Add a 3x3 data table"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            tooltip="Horizontal Divider - Insert a line to separate content"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
            </svg>
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-navy/10 mx-2" />

        {/* Delete Block */}
        <div className="flex items-center gap-1">
          <Tooltip content="Delete Block - Remove the current block (select text first)">
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
              className="p-2 rounded-md text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </Tooltip>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Save Status & Button */}
        <div className="flex items-center gap-3">
          {lastSaved && !hasUnsavedChanges && (
            <span className="text-xs text-muted">
              Saved {formatRelativeTime(lastSaved)}
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-600 font-medium">
              Unsaved changes
            </span>
          )}
          <Tooltip content="Save changes (⌘S)">
            <button
              onClick={onSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="flex items-center gap-2 h-9 px-4 bg-navy text-white rounded-md text-sm font-medium hover:bg-navy-mid disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save
                </>
              )}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

// Toolbar button component with tooltip
function ToolbarButton({
  onClick,
  isActive,
  tooltip,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  tooltip: string
  children: React.ReactNode
}) {
  return (
    <Tooltip content={tooltip}>
      <button
        onClick={onClick}
        className={`p-2 rounded-md transition-colors ${
          isActive
            ? 'bg-navy text-white'
            : 'text-navy hover:bg-navy/10'
        }`}
      >
        {children}
      </button>
    </Tooltip>
  )
}
