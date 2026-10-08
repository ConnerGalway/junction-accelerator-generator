import type { TipTapContent } from './supabase'

// Default empty document
export const emptyDocument: TipTapContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Untitled Plan' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Start writing your implementation plan...' }],
    },
  ],
}

// Sample document for demo mode
export const sampleDocument: TipTapContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: '90-Day Marketing Accelerator Plan' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'This accelerator plan will help you build a strong digital marketing foundation, establish your brand presence, and drive sustainable growth for your tourism business.',
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Strategic Positioning' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Position your business as the premier destination for authentic local experiences. Emphasize your unique story, deep community connections, and commitment to sustainable tourism practices.',
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Tactic 1: Social Media Foundation' }],
    },
    {
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'What We Heard From You' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: "You mentioned that social media feels overwhelming and you're not sure what to post. Your current presence is inconsistent and doesn't reflect your brand well.",
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'What This Is' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: "A structured approach to social media that focuses on quality over quantity. We'll establish a sustainable posting rhythm and create content pillars that align with your brand story.",
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: 'Implementation Steps' }],
    },
    {
      type: 'orderedList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  marks: [{ type: 'bold' }],
                  text: 'Audit your current profiles',
                },
                {
                  type: 'text',
                  text: ' - Review all social media accounts and ensure consistent branding, bios, and contact information.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  marks: [{ type: 'bold' }],
                  text: 'Define 4 content pillars',
                },
                {
                  type: 'text',
                  text: ' - Create themes that represent your brand (e.g., Behind the Scenes, Guest Stories, Local Culture, Tips & Guides).',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  marks: [{ type: 'bold' }],
                  text: 'Create a content calendar',
                },
                {
                  type: 'text',
                  text: ' - Plan posts 2 weeks in advance, aiming for 3-4 posts per week.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{ type: 'italic' }],
              text: 'Tip: Focus on Instagram and Facebook first. Master these platforms before expanding to others.',
            },
          ],
        },
      ],
    },
  ],
}

// Debounce function for autosave
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: then.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}
