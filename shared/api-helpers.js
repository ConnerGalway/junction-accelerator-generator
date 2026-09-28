// ═══════════════════════════════════════════════════════════════════════════
// SHARED API HELPERS
// Common utility functions for API calls, data sanitization, and domain extraction
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch with retry and exponential backoff
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} retryConfig - Retry configuration
 * @returns {Promise<Response>} - Fetch response
 */
export async function fetchWithRetry(url, options = {}, retryConfig = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    timeoutMs = 30000,
    logPrefix = '[Fetch]'
  } = retryConfig;

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Success - return response
      if (response.ok) {
        if (attempt > 1) {
          console.log(`${logPrefix} Succeeded on attempt ${attempt}`);
        }
        return response;
      }

      // Server errors (5xx) - retry
      if (response.status >= 500 && attempt < maxRetries) {
        console.warn(`${logPrefix} Server error ${response.status} on attempt ${attempt}, retrying...`);
        lastError = new Error(`HTTP ${response.status}`);
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      // Client errors (4xx) or final attempt - return as-is
      return response;

    } catch (err) {
      lastError = err;

      // Timeout or network error
      if (err.name === 'AbortError') {
        console.warn(`${logPrefix} Timeout on attempt ${attempt}/${maxRetries}`);
      } else {
        console.warn(`${logPrefix} Network error on attempt ${attempt}/${maxRetries}:`, err.message);
      }

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(`${logPrefix} Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error(`${logPrefix} All ${maxRetries} attempts failed`);
}

/**
 * Fetch with timeout (single attempt, no retry)
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} - Fetch response
 */
export async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000}s: ${url}`);
    }
    throw err;
  }
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Extract domain from URL, normalizing common variations
 * @param {string} url - URL to extract domain from
 * @returns {string|null} - Normalized domain or null
 */
export function extractDomain(url) {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    // Remove www. and common subdomains
    return hostname.replace(/^(www|m|mobile)\./, '');
  } catch {
    return null;
  }
}

/**
 * Strip HTML tags from text to prevent XSS and rendering issues
 * Used to sanitize AI-generated content that may accidentally include HTML
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
export function stripHtmlTags(text) {
  if (typeof text !== 'string') return text;
  // Remove HTML tags but preserve the text content
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')   // Decode common HTML entities (for display purposes)
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Recursively sanitize all string values in an object to remove HTML tags
 * Ensures AI-generated assessment content doesn't contain HTML that could render incorrectly
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
export function sanitizeAssessmentData(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return stripHtmlTags(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeAssessmentData(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip internal metadata fields that shouldn't be sanitized
      if (key.startsWith('_')) {
        sanitized[key] = value;
      } else {
        sanitized[key] = sanitizeAssessmentData(value);
      }
    }
    return sanitized;
  }

  return obj;
}
