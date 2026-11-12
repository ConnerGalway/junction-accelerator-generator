#!/usr/bin/env node
/**
 * Migration script to convert existing plan.md files to TipTap JSON format
 * and insert them into the editor_documents table in Supabase.
 *
 * Usage: node scripts/migrate-plans-to-editor.mjs [client-slug]
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables')
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/**
 * Parse inline markdown formatting (bold, italic, code, links)
 */
function parseInlineContent(text) {
  if (!text || text.trim() === '') {
    return []
  }

  const nodes = []
  let remaining = text

  // Handle links
  const linkRegex = /\[(.+?)\]\((.+?)\)/g
  let lastIndex = 0
  let match

  while ((match = linkRegex.exec(text)) !== null) {
    // Text before the link
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index)
      if (beforeText) {
        nodes.push({ type: 'text', text: beforeText })
      }
    }

    // The link itself
    nodes.push({
      type: 'text',
      text: match[1],
      marks: [{ type: 'link', attrs: { href: match[2] } }]
    })

    lastIndex = match.index + match[0].length
  }

  // Remaining text after last link
  if (lastIndex < text.length) {
    const afterText = text.slice(lastIndex)
    if (afterText) {
      nodes.push({ type: 'text', text: afterText })
    }
  }

  // If no links found, return plain text
  if (nodes.length === 0 && text.trim()) {
    nodes.push({ type: 'text', text })
  }

  return nodes
}

/**
 * Convert markdown text to TipTap JSON nodes
 */
function markdownToTipTap(markdown) {
  const lines = markdown.split('\n')
  const content = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip empty lines
    if (line.trim() === '') {
      i++
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      content.push({
        type: 'heading',
        attrs: { level },
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
      while (i < lines.length && (lines[i].startsWith('>') || (lines[i].trim() === '' && i + 1 < lines.length && lines[i + 1].startsWith('>')))) {
        if (lines[i].startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''))
        } else {
          quoteLines.push('')
        }
        i++
      }
      const quoteContent = markdownToTipTap(quoteLines.join('\n'))
      content.push({
        type: 'blockquote',
        content: quoteContent.content
      })
      continue
    }

    // Unordered list
    if (line.match(/^[-*]\s/)) {
      const listItems = []
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        const itemText = lines[i].replace(/^[-*]\s/, '')
        listItems.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineContent(itemText)
          }]
        })
        i++
      }
      content.push({
        type: 'bulletList',
        content: listItems
      })
      continue
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      const listItems = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        const itemText = lines[i].replace(/^\d+\.\s/, '')
        listItems.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineContent(itemText)
          }]
        })
        i++
      }
      content.push({
        type: 'orderedList',
        content: listItems
      })
      continue
    }

    // Table
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableRows = []
      while (i < lines.length && lines[i].includes('|')) {
        const row = lines[i]
        // Skip separator row (|---|---|)
        if (row.match(/^\|[\s-:|]+\|$/)) {
          i++
          continue
        }
        const cells = row.split('|').filter(c => c.trim() !== '').map(c => c.trim())
        if (cells.length > 0) {
          tableRows.push(cells)
        }
        i++
      }

      if (tableRows.length > 0) {
        const tableContent = tableRows.map((row, rowIndex) => ({
          type: 'tableRow',
          content: row.map(cell => ({
            type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
            content: [{
              type: 'paragraph',
              content: parseInlineContent(cell)
            }]
          }))
        }))

        content.push({
          type: 'table',
          content: tableContent
        })
      }
      continue
    }

    // Regular paragraph
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
      content.push({
        type: 'paragraph',
        content: parseInlineContent(paragraphLines.join(' '))
      })
    }
  }

  return { type: 'doc', content }
}

/**
 * Get all client directories
 */
function getClientDirs(clientsPath) {
  if (!fs.existsSync(clientsPath)) {
    return []
  }

  return fs.readdirSync(clientsPath)
    .filter(name => {
      const fullPath = path.join(clientsPath, name)
      return fs.statSync(fullPath).isDirectory() &&
             fs.existsSync(path.join(fullPath, 'plan.md'))
    })
}

/**
 * Migrate a single client's plan to the editor
 */
async function migrateClient(clientSlug, clientsPath) {
  const clientDir = path.join(clientsPath, clientSlug)
  const planPath = path.join(clientDir, 'plan.md')

  if (!fs.existsSync(planPath)) {
    console.error(`  ❌ No plan.md found for ${clientSlug}`)
    return false
  }

  console.log(`  📄 Reading ${planPath}`)
  const markdown = fs.readFileSync(planPath, 'utf-8')

  console.log(`  🔄 Converting to TipTap format...`)
  const tiptapDoc = markdownToTipTap(markdown)

  console.log(`  📊 Generated ${tiptapDoc.content.length} top-level nodes`)

  // Check if document already exists
  const { data: existing } = await supabase
    .from('editor_documents')
    .select('id')
    .eq('client_slug', clientSlug)
    .single()

  if (existing) {
    console.log(`  ⚠️  Document already exists for ${clientSlug}, updating...`)
    const { error } = await supabase
      .from('editor_documents')
      .update({
        content: tiptapDoc,
        updated_at: new Date().toISOString(),
        updated_by: 'migration-script'
      })
      .eq('client_slug', clientSlug)

    if (error) {
      console.error(`  ❌ Failed to update: ${error.message}`)
      return false
    }
  } else {
    console.log(`  ➕ Creating new document for ${clientSlug}`)
    const { error } = await supabase
      .from('editor_documents')
      .insert({
        client_slug: clientSlug,
        content: tiptapDoc,
        status: 'draft',
        created_by: 'migration-script',
        updated_by: 'migration-script'
      })

    if (error) {
      console.error(`  ❌ Failed to insert: ${error.message}`)
      return false
    }
  }

  console.log(`  ✅ Successfully migrated ${clientSlug}`)
  return true
}

/**
 * Main migration function
 */
async function main() {
  const args = process.argv.slice(2)
  const specificClient = args[0]

  // Find the clients directory
  const scriptDir = __dirname
  const projectRoot = path.resolve(scriptDir, '..')
  const clientsPath = path.join(projectRoot, 'clients')

  console.log('🚀 Plan Migration Tool')
  console.log('======================')
  console.log(`📂 Clients directory: ${clientsPath}`)
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`)
  console.log('')

  if (specificClient) {
    console.log(`📌 Migrating single client: ${specificClient}`)
    const success = await migrateClient(specificClient, clientsPath)
    process.exit(success ? 0 : 1)
  }

  // Migrate all clients
  const clientDirs = getClientDirs(clientsPath)

  if (clientDirs.length === 0) {
    console.log('❌ No clients found with plan.md files')
    process.exit(1)
  }

  console.log(`📋 Found ${clientDirs.length} clients to migrate:`)
  clientDirs.forEach(c => console.log(`   - ${c}`))
  console.log('')

  let successCount = 0
  let failCount = 0

  for (const clientSlug of clientDirs) {
    console.log(`\n🔄 Processing: ${clientSlug}`)
    const success = await migrateClient(clientSlug, clientsPath)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  console.log('\n' + '='.repeat(40))
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log('='.repeat(40))

  process.exit(failCount > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
