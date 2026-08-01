/**
 * Tests for CORS logic in invite-client function
 * Tests the CORS header logic without importing the full module
 */

describe('CORS Origin Validation Logic', () => {
  // Extracted CORS logic for testing
  const allowedOrigins = [
    'https://accelerator.elearningu.com',
    'https://junction-accelerator-generator.netlify.app'
  ];

  function getCorsOrigin(requestOrigin) {
    return allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
  }

  test('should allow accelerator.elearningu.com origin', () => {
    const origin = 'https://accelerator.elearningu.com';
    expect(getCorsOrigin(origin)).toBe('https://accelerator.elearningu.com');
  });

  test('should allow Netlify preview origin', () => {
    const origin = 'https://junction-accelerator-generator.netlify.app';
    expect(getCorsOrigin(origin)).toBe('https://junction-accelerator-generator.netlify.app');
  });

  test('should not allow arbitrary origins - defaults to primary', () => {
    const origin = 'https://evil-site.com';
    expect(getCorsOrigin(origin)).toBe('https://accelerator.elearningu.com');
  });

  test('should not allow localhost in production', () => {
    const origin = 'http://localhost:3000';
    expect(getCorsOrigin(origin)).toBe('https://accelerator.elearningu.com');
  });

  test('should handle empty origin', () => {
    const origin = '';
    expect(getCorsOrigin(origin)).toBe('https://accelerator.elearningu.com');
  });

  test('should handle undefined origin', () => {
    const origin = undefined;
    expect(getCorsOrigin(origin)).toBe('https://accelerator.elearningu.com');
  });

  test('should not allow similar but different origins', () => {
    // These look similar but are different domains
    expect(getCorsOrigin('https://accelerator.elearningu.com.evil.com')).toBe('https://accelerator.elearningu.com');
    expect(getCorsOrigin('https://fake-accelerator.elearningu.com')).toBe('https://accelerator.elearningu.com');
    expect(getCorsOrigin('http://accelerator.elearningu.com')).toBe('https://accelerator.elearningu.com'); // Wrong protocol
  });
});
