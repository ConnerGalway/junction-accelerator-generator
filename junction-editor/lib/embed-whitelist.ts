/**
 * Embed Whitelist
 *
 * Centralized configuration for allowed embed domains and URL parsing.
 * Used by the EmbedPanel to validate and transform URLs.
 */

// ──────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────

export type EmbedProvider = 'youtube' | 'vimeo' | 'loom' | 'google-docs' | 'canva' | 'figma' | 'miro' | 'airtable' | 'calendly' | 'typeform' | 'notion' | 'unknown'

export interface EmbedConfig {
  provider: EmbedProvider
  name: string
  domains: string[]
  // Function to extract embed URL from source URL
  getEmbedUrl?: (url: string) => string | null
  // Recommended aspect ratio
  defaultAspectRatio?: '16:9' | '4:3' | '1:1'
  // Whether this provider supports auto-play
  supportsAutoplay?: boolean
}

// ──────────────────────────────────────────────────────────────────────────
// PROVIDER CONFIGURATIONS
// ──────────────────────────────────────────────────────────────────────────

export const EMBED_PROVIDERS: EmbedConfig[] = [
  {
    provider: 'youtube',
    name: 'YouTube',
    domains: ['youtube.com', 'www.youtube.com', 'youtu.be'],
    defaultAspectRatio: '16:9',
    supportsAutoplay: true,
    getEmbedUrl: (url) => {
      // Match: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
      const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      ]

      for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) {
          return `https://www.youtube.com/embed/${match[1]}`
        }
      }
      return null
    },
  },
  {
    provider: 'vimeo',
    name: 'Vimeo',
    domains: ['vimeo.com', 'player.vimeo.com'],
    defaultAspectRatio: '16:9',
    supportsAutoplay: true,
    getEmbedUrl: (url) => {
      // Match: vimeo.com/ID
      const match = url.match(/vimeo\.com\/(\d+)/)
      if (match) {
        return `https://player.vimeo.com/video/${match[1]}`
      }
      return null
    },
  },
  {
    provider: 'loom',
    name: 'Loom',
    domains: ['loom.com', 'www.loom.com'],
    defaultAspectRatio: '16:9',
    supportsAutoplay: false,
    getEmbedUrl: (url) => {
      // Match: loom.com/share/ID
      const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
      if (match) {
        return `https://www.loom.com/embed/${match[1]}`
      }
      return null
    },
  },
  {
    provider: 'google-docs',
    name: 'Google Docs',
    domains: ['docs.google.com', 'drive.google.com', 'forms.google.com', 'sheets.google.com', 'slides.google.com'],
    defaultAspectRatio: '4:3',
    getEmbedUrl: (url) => {
      // Google Docs URLs are often already embeddable or need /preview suffix
      if (url.includes('/pub') || url.includes('/preview') || url.includes('/embed')) {
        return url
      }
      // Convert /edit to /preview for docs/sheets/slides
      if (url.includes('/edit')) {
        return url.replace('/edit', '/preview')
      }
      return url
    },
  },
  {
    provider: 'canva',
    name: 'Canva',
    domains: ['canva.com', 'www.canva.com'],
    defaultAspectRatio: '16:9',
    getEmbedUrl: (url) => {
      // Canva designs with /watch or /view can be embedded
      return url
    },
  },
  {
    provider: 'figma',
    name: 'Figma',
    domains: ['figma.com', 'www.figma.com'],
    defaultAspectRatio: '16:9',
    getEmbedUrl: (url) => {
      // Figma URLs need to use the embed endpoint
      const match = url.match(/figma\.com\/(file|proto)\/([a-zA-Z0-9]+)/)
      if (match) {
        return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`
      }
      return url
    },
  },
  {
    provider: 'miro',
    name: 'Miro',
    domains: ['miro.com'],
    defaultAspectRatio: '16:9',
    getEmbedUrl: (url) => {
      // Miro board URLs can be converted to live embed
      const match = url.match(/miro\.com\/app\/board\/([a-zA-Z0-9_=-]+)/)
      if (match) {
        return `https://miro.com/app/live-embed/${match[1]}/`
      }
      return url
    },
  },
  {
    provider: 'airtable',
    name: 'Airtable',
    domains: ['airtable.com'],
    defaultAspectRatio: '4:3',
    getEmbedUrl: (url) => {
      // Airtable shared views can be embedded
      return url.replace('/shr', '/embed/shr')
    },
  },
  {
    provider: 'calendly',
    name: 'Calendly',
    domains: ['calendly.com'],
    defaultAspectRatio: '4:3',
    getEmbedUrl: (url) => url,
  },
  {
    provider: 'typeform',
    name: 'Typeform',
    domains: ['typeform.com'],
    defaultAspectRatio: '4:3',
    getEmbedUrl: (url) => url,
  },
  {
    provider: 'notion',
    name: 'Notion',
    domains: ['notion.site', 'notion.so'],
    defaultAspectRatio: '4:3',
    getEmbedUrl: (url) => url,
  },
]

// ──────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────

/**
 * Get all allowed domains as a flat array
 */
export function getAllowedDomains(): string[] {
  return EMBED_PROVIDERS.flatMap(p => p.domains)
}

/**
 * Check if a domain is allowed for embedding
 */
export function isDomainAllowed(domain: string): boolean {
  const normalized = domain.toLowerCase()
  return EMBED_PROVIDERS.some(provider =>
    provider.domains.some(d => normalized === d || normalized.endsWith('.' + d))
  )
}

/**
 * Get the provider configuration for a URL
 */
export function getProviderForUrl(url: string): EmbedConfig | null {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.toLowerCase()

    return EMBED_PROVIDERS.find(provider =>
      provider.domains.some(d => domain === d || domain.endsWith('.' + d))
    ) || null
  } catch {
    return null
  }
}

/**
 * Parse a URL and return embed information
 */
export function parseEmbedUrl(input: string): {
  provider: EmbedProvider
  name: string
  embedUrl: string
  aspectRatio: '16:9' | '4:3' | '1:1'
} | null {
  const trimmed = input.trim()

  // Check for iframe HTML and extract src
  const iframeMatch = trimmed.match(/<iframe[^>]*src=["']([^"']+)["'][^>]*>/i)
  if (iframeMatch) {
    return parseEmbedUrl(iframeMatch[1])
  }

  // Try to parse as URL
  try {
    const url = new URL(trimmed)
    const provider = getProviderForUrl(trimmed)

    if (provider) {
      const embedUrl = provider.getEmbedUrl?.(trimmed) || trimmed

      return {
        provider: provider.provider,
        name: provider.name,
        embedUrl,
        aspectRatio: provider.defaultAspectRatio || '16:9',
      }
    }
  } catch {
    // Not a valid URL
  }

  return null
}

/**
 * Build safe embed HTML with proper sandboxing
 */
export function buildSafeEmbedHtml(
  embedUrl: string,
  options: {
    title?: string
    width?: number
    height?: number
    aspectRatio?: '16:9' | '4:3' | '1:1'
  } = {}
): string {
  const {
    title = 'Embedded content',
    width = 640,
    height,
    aspectRatio = '16:9',
  } = options

  // Calculate height from aspect ratio if not provided
  let computedHeight = height
  if (!computedHeight) {
    switch (aspectRatio) {
      case '16:9': computedHeight = Math.round(width * 9 / 16); break
      case '4:3': computedHeight = Math.round(width * 3 / 4); break
      case '1:1': computedHeight = width; break
    }
  }

  const paddingBottom = ((computedHeight || 360) / width) * 100

  // Escape special characters
  const escapedUrl = embedUrl
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  return `<div class="embed-container" style="position: relative; width: 100%; padding-bottom: ${paddingBottom.toFixed(2)}%; margin: 1rem 0;">
  <iframe
    src="${escapedUrl}"
    title="${escapedTitle}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
  ></iframe>
</div>`
}
