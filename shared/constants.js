/**
 * Shared constants for the Junction Accelerator platform
 * This file is designed to be used in both browser and Node.js environments
 */

// User roles
const ROLES = {
  ADMIN: 'admin',
  PSM: 'psm',
  COACH: 'coach',
  CLIENT: 'client'
};

// Admin roles (roles with elevated access)
const ADMIN_ROLES = [ROLES.ADMIN, ROLES.PSM];

// All dashboard roles (non-client roles)
const DASHBOARD_ROLES = [ROLES.ADMIN, ROLES.PSM, ROLES.COACH];

// Valid slug pattern for client slugs
const SLUG_PATTERN = /^[a-z0-9-]+$/;

// Validate a client slug format
function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_PATTERN.test(slug);
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Check if storage is available (for browser environments)
function isStorageAvailable(type = 'sessionStorage') {
  try {
    const storage = window[type];
    const test = '__storage_test__';
    storage.setItem(test, test);
    storage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // Node.js / CommonJS
  module.exports = {
    ROLES,
    ADMIN_ROLES,
    DASHBOARD_ROLES,
    SLUG_PATTERN,
    isValidSlug,
    escapeHtml,
    isStorageAvailable
  };
} else if (typeof window !== 'undefined') {
  // Browser global
  window.JunctionConstants = {
    ROLES,
    ADMIN_ROLES,
    DASHBOARD_ROLES,
    SLUG_PATTERN,
    isValidSlug,
    escapeHtml,
    isStorageAvailable
  };
}
