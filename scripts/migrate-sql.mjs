#!/usr/bin/env node
/**
 * Migration using Supabase SQL RPC to bypass REST schema cache
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

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

function markdownToTipTap(markdown) {
  const lines = markdown.split('\n')
  const content = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') { i++; continue }

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

    if (line.match(/^---+$/)) {
      content.push({ type: 'horizontalRule' })
      i++
      continue
    }

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

  console.log('🚀 SQL Migration Tool')
  console.log(`📄 Reading: ${planPath}`)

  const markdown = fs.readFileSync(planPath, 'utf-8')
  const tiptapDoc = markdownToTipTap(markdown)

  console.log(`📊 Generated ${tiptapDoc.content.length} nodes`)

  // Use raw SQL via rpc
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      INSERT INTO editor_documents (client_slug, content, status, created_by, updated_by)
      VALUES ($1, $2, 'draft', 'migration-script', 'migration-script')
      ON CONFLICT (client_slug) DO UPDATE SET
        content = EXCLUDED.content,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING id
    `,
    params: [clientSlug, JSON.stringify(tiptapDoc)]
  })

  if (error) {
    // Fallback: try direct SQL insert via fetch to SQL endpoint
    console.log('⚠️  RPC not available, trying direct SQL...')

    const sqlResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `SELECT 1`
      })
    })

    console.log('Direct approach needed. Please run this SQL in Supabase:')
    console.log('')
    console.log(`INSERT INTO editor_documents (client_slug, content, status, created_by, updated_by)`)
    console.log(`VALUES ('${clientSlug}', '${JSON.stringify(tiptapDoc).replace(/'/g, "''")}', 'draft', 'migration-script', 'migration-script');`)
    console.log('')
    console.log('Or save the JSON to a file...')

    // Save JSON to file for manual import
    const outputPath = path.join(__dirname, `${clientSlug}-tiptap.json`)
    fs.writeFileSync(outputPath, JSON.stringify(tiptapDoc, null, 2))
    console.log(`📁 Saved TipTap JSON to: ${outputPath}`)

    process.exit(1)
  }

  console.log(`✅ Success! Document ID: ${data?.[0]?.id}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
