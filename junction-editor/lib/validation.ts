/**
 * Validation utilities for security
 */

// Allowed URL protocols for links
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

/**
 * Validates a URL to prevent XSS attacks via javascript: or data: URLs
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false

  try {
    const parsed = new URL(url, window.location.origin)
    return ALLOWED_PROTOCOLS.includes(parsed.protocol)
  } catch {
    // If URL constructor fails, check if it's a relative path
    // Relative paths are safe (they resolve to current origin)
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return true
    }
    return false
  }
}

/**
 * Sanitizes a URL, returning null if invalid
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null

  const trimmed = url.trim()
  if (!trimmed) return null

  // Check for dangerous protocols
  const lowerUrl = trimmed.toLowerCase()
  if (
    lowerUrl.startsWith('javascript:') ||
    lowerUrl.startsWith('data:') ||
    lowerUrl.startsWith('vbscript:')
  ) {
    return null
  }

  if (!isValidUrl(trimmed)) return null

  return trimmed
}

/**
 * Validates file MIME type on client side
 * Note: This is NOT a security measure - server must also validate
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

export function isValidImageType(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType)
}

/**
 * Maximum file size (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

export function isValidFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE
}

/**
 * Validates that a string is not empty after trimming
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Escapes HTML entities to prevent XSS in text content
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char] || char)
}

/**
 * Validates URL for image fetching (prevents SSRF)
 * Only allows http/https and blocks private IPs
 */
export function isValidExternalImageUrl(url: string): boolean {
  if (!isValidUrl(url)) return false

  try {
    const parsed = new URL(url)

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false
    }

    // Block localhost and private IPs
    const hostname = parsed.hostname.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return false
    }

    return true
  } catch {
    return false
  }
}
