#!/usr/bin/env node
/**
 * Direct migration using fetch API to bypass Supabase client schema cache
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY

/**
 * Parse inline markdown formatting
 */
function parseInlineContent(text) {
  if (!text || text.trim() === '') return []

  const nodes = []
  const linkRegex = /\[(.+?)\]\((.+?)\)/g
  let lastIndex = 0
  let match

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index)
      if (beforeText) nodes.push({ type: 'text', text: beforeText })
    }
    nodes.push({
      type: 'text',
      text: match[1],
      marks: [{ type: 'link', attrs: { href: match[2] } }]
    })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    const afterText = text.slice(lastIndex)
    if (afterText) nodes.push({ type: 'text', text: afterText })
  }

  if (nodes.length === 0 && text.trim()) {
    nodes.push({ type: 'text', text })
  }

  return nodes
}

/**
 * Convert markdown to TipTap JSON
 */
function markdownToTipTap(markdown) {
  const lines = markdown.split('\n')
  const content = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') { i++; continue }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      content.push({
        type: 'heading',
        attrs: { level: headingMatch[1].length },
        content: parseInlineContent(headingMatch[2])
      })
      i++
      continue
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      content.push({ type: 'horizontalRule' })
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines = []
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      const quoteContent = markdownToTipTap(quoteLines.join('\n'))
      content.push({ type: 'blockquote', content: quoteContent.content })
      continue
    }

    // Unordered list
    if (line.match(/^[-*]\s/)) {
      const listItems = []
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        listItems.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInlineContent(lines[i].replace(/^[-*]\s/, '')) }]
        })
        i++
      }
      content.push({ type: 'bulletList', content: listItems })
      continue
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      const listItems = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        listItems.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInlineContent(lines[i].replace(/^\d+\.\s/, '')) }]
        })
        i++
      }
      content.push({ type: 'orderedList', content: listItems })
      continue
    }

    // Table
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableRows = []
      while (i < lines.length && lines[i].includes('|')) {
        const row = lines[i]
        if (!row.match(/^\|[\s-:|]+\|$/)) {
          const cells = row.split('|').filter(c => c.trim() !== '').map(c => c.trim())
          if (cells.length > 0) tableRows.push(cells)
        }
        i++
      }
      if (tableRows.length > 0) {
        content.push({
          type: 'table',
          content: tableRows.map((row, idx) => ({
            type: 'tableRow',
            content: row.map(cell => ({
              type: idx === 0 ? 'tableHeader' : 'tableCell',
              content: [{ type: 'paragraph', content: parseInlineContent(cell) }]
            }))
          }))
        })
      }
      continue
    }

    // Paragraph
    const paragraphLines = []
    while (i < lines.length &&
           lines[i].trim() !== '' &&
           !lines[i].match(/^#{1,6}\s/) &&
           !lines[i].match(/^[-*]\s/) &&
           !lines[i].match(/^\d+\.\s/) &&
           !lines[i].startsWith('>') &&
           !lines[i].match(/^---+$/) &&
           !(lines[i].includes('|') && lines[i].trim().startsWith('|'))) {
      paragraphLines.push(lines[i])
      i++
    }
    if (paragraphLines.length > 0) {
      content.push({ type: 'paragraph', content: parseInlineContent(paragraphLines.join(' ')) })
    }
  }

  return { type: 'doc', content }
}

async function main() {
  const clientSlug = process.argv[2] || 'red-cariboo-resort'
  const clientsPath = path.resolve(__dirname, '..', 'clients')
  const planPath = path.join(clientsPath, clientSlug, 'plan.md')

  console.log('🚀 Direct Migration Tool')
  console.log(`📄 Reading: ${planPath}`)

  const markdown = fs.readFileSync(planPath, 'utf-8')
  const tiptapDoc = markdownToTipTap(markdown)

  console.log(`📊 Generated ${tiptapDoc.content.length} nodes`)

  // Direct REST API call
  const response = await fetch(`${SUPABASE_URL}/rest/v1/editor_documents`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      client_slug: clientSlug,
      content: tiptapDoc,
      status: 'draft',
      created_by: 'migration-script',
      updated_by: 'migration-script'
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`❌ Failed: ${response.status} - ${error}`)
    process.exit(1)
  }

  const result = await response.json()
  console.log(`✅ Success! Document ID: ${result[0]?.id}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
