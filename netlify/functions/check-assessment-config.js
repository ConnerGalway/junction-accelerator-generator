// Diagnostic function to check assessment configuration
// This is NOT a background function so it returns results immediately

export async function handler(event, context) {
  const checks = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SEOPTIMER_API_KEY: !!process.env.SEOPTIMER_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    GITHUB_TOKEN: !!process.env.GITHUB_TOKEN,
    GITHUB_OWNER: !!process.env.GITHUB_OWNER,
    GITHUB_REPO: !!process.env.GITHUB_REPO,
    GOOGLE_PLACES_KEY: !!process.env.GOOGLE_PLACES_KEY // optional
  };

  const missing = Object.entries(checks)
    .filter(([key, value]) => !value && key !== 'GOOGLE_PLACES_KEY')
    .map(([key]) => key);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: missing.length === 0 ? 'OK' : 'MISSING_CONFIG',
      checks,
      missing,
      message: missing.length === 0
        ? 'All required environment variables are configured'
        : `Missing required variables: ${missing.join(', ')}`
    }, null, 2)
  };
}
