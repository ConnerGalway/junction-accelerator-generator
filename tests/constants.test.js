/**
 * Tests for shared/constants.js
 */

const {
  ROLES,
  ADMIN_ROLES,
  DASHBOARD_ROLES,
  isValidSlug,
  escapeHtml
} = require('../shared/constants');

describe('ROLES', () => {
  test('should have all expected roles', () => {
    expect(ROLES.ADMIN).toBe('admin');
    expect(ROLES.PSM).toBe('psm');
    expect(ROLES.COACH).toBe('coach');
    expect(ROLES.CLIENT).toBe('client');
  });

  test('ADMIN_ROLES should include admin and psm', () => {
    expect(ADMIN_ROLES).toContain('admin');
    expect(ADMIN_ROLES).toContain('psm');
    expect(ADMIN_ROLES).not.toContain('coach');
    expect(ADMIN_ROLES).not.toContain('client');
  });

  test('DASHBOARD_ROLES should include admin, psm, and coach', () => {
    expect(DASHBOARD_ROLES).toContain('admin');
    expect(DASHBOARD_ROLES).toContain('psm');
    expect(DASHBOARD_ROLES).toContain('coach');
    expect(DASHBOARD_ROLES).not.toContain('client');
  });
});

describe('isValidSlug', () => {
  test('should accept valid slugs', () => {
    expect(isValidSlug('client-name')).toBe(true);
    expect(isValidSlug('client123')).toBe(true);
    expect(isValidSlug('a')).toBe(true);
    expect(isValidSlug('red-cariboo-resort')).toBe(true);
    expect(isValidSlug('123')).toBe(true);
  });

  test('should reject invalid slugs', () => {
    // Path traversal attempts
    expect(isValidSlug('../admin')).toBe(false);
    expect(isValidSlug('../../etc/passwd')).toBe(false);

    // Special characters
    expect(isValidSlug('client name')).toBe(false);
    expect(isValidSlug('client_name')).toBe(false);
    expect(isValidSlug('Client-Name')).toBe(false);
    expect(isValidSlug('<script>alert(1)</script>')).toBe(false);

    // Empty or non-string
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug(null)).toBe(false);
    expect(isValidSlug(undefined)).toBe(false);
    expect(isValidSlug(123)).toBe(false);
  });
});

describe('escapeHtml', () => {
  test('should escape HTML special characters', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  test('should handle edge cases', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('should handle combined XSS attempts', () => {
    const xssAttempt = '<script>alert("XSS")</script>';
    const escaped = escapeHtml(xssAttempt);
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
    expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  });

  test('should leave safe strings unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
    expect(escapeHtml('user@example.com')).toBe('user@example.com');
    expect(escapeHtml('123-456-7890')).toBe('123-456-7890');
  });
});
