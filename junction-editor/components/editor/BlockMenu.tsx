'use client'

import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { Tooltip } from '@/components/ui'

interface BlockMenuProps {
  editor: Editor
  onInsertImage: () => void
  onInsertAIImage?: () => void
}

const blockTypes = [
  {
    name: 'Heading 1',
    description: 'Large section heading',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-6 4h8" />
      </svg>
    ),
    action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    name: 'Heading 2',
    description: 'Medium section heading',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-6 4h8" />
      </svg>
    ),
    action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    name: 'Paragraph',
    description: 'Normal text paragraph',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h12" />
      </svg>
    ),
    action: (editor: Editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    name: 'Bullet List',
    description: 'Simple bullet list',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="2" cy="6" r="1" fill="currentColor" />
        <circle cx="2" cy="12" r="1" fill="currentColor" />
        <circle cx="2" cy="18" r="1" fill="currentColor" />
      </svg>
    ),
    action: (editor: Editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    name: 'Numbered List',
    description: 'Ordered numbered list',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13" />
      </svg>
    ),
    action: (editor: Editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    name: 'Quote',
    description: 'Blockquote for emphasis',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    action: (editor: Editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    name: 'Image',
    description: 'Upload or select an image',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    action: null, // Special case - handled by onInsertImage callback
  },
  {
    name: 'AI Image',
    description: 'Generate with DALL-E',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    action: null, // Special case - handled by onInsertAIImage callback
    isAI: true,
  },
  {
    name: 'Table',
    description: 'Insert a data table',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
      </svg>
    ),
    action: (editor: Editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    name: 'Divider',
    description: 'Horizontal line divider',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
      </svg>
    ),
    action: (editor: Editor) => editor.chain().focus().setHorizontalRule().run(),
  },
]

export function BlockMenu({ editor, onInsertImage, onInsertAIImage }: BlockMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Filter blocks based on search
  const filteredBlocks = blockTypes.filter(
    (block) =>
      block.name.toLowerCase().includes(search.toLowerCase()) ||
      block.description.toLowerCase().includes(search.toLowerCase())
  )

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle block selection
  const handleSelectBlock = (block: (typeof blockTypes)[0]) => {
    setIsOpen(false)
    setSearch('')

    if (block.name === 'Image') {
      onInsertImage()
    } else if (block.name === 'AI Image') {
      onInsertAIImage?.()
    } else if (block.action) {
      block.action(editor)
    }
  }

  return (
    <div className="relative mb-4">
      {/* Add Block Button */}
      <Tooltip content="Add Block - Insert headings, lists, images, tables, and more">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted hover:text-navy bg-white/50 hover:bg-white border border-dashed border-navy/20 hover:border-navy/40 rounded-lg transition-all duration-200"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add block
        </button>
      </Tooltip>

      {/* Block Menu Dropdown */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg border border-navy/10 shadow-dropdown z-20 animate-fade-in"
        >
          {/* Search Input */}
          <div className="p-2 border-b border-navy/10">
            <input
              type="text"
              placeholder="Search blocks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-navy/15 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/20"
              autoFocus
            />
          </div>

          {/* Block List */}
          <div className="max-h-72 overflow-y-auto p-2">
            {filteredBlocks.length > 0 ? (
              <div className="space-y-1">
                {filteredBlocks.map((block) => (
                  <button
                    key={block.name}
                    onClick={() => handleSelectBlock(block)}
                    className={`flex items-center gap-3 w-full p-2 text-left rounded-md transition-colors group ${
                      'isAI' in block && block.isAI
                        ? 'hover:bg-purple-50'
                        : 'hover:bg-cream'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      'isAI' in block && block.isAI
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                        : 'bg-mint/20 group-hover:bg-mint/30 text-navy'
                    }`}>
                      {block.icon}
                    </div>
                    <div>
                      <div className={`font-medium text-sm ${
                        'isAI' in block && block.isAI ? 'text-purple-700' : 'text-navy'
                      }`}>
                        {block.name}
                      </div>
                      <div className="text-xs text-muted">
                        {block.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted">
                No blocks found
              </div>
            )}
          </div>

          {/* Footer Hint */}
          <div className="p-2 border-t border-navy/10 bg-cream/50 rounded-b-lg">
            <p className="text-xs text-muted text-center">
              Type <kbd className="px-1 py-0.5 bg-white border border-navy/15 rounded text-navy">/</kbd> in the editor for quick access
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
