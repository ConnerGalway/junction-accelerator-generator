/**
 * Verification Engine - Pre-publish data validation for assessments
 *
 * This module validates API data (SociaVault, SEOptimer, Google Places) before
 * assessments are published. It runs sanity checks and attempts cross-verification
 * to catch data discrepancies like the SociaVault bug that reported 12 posts
 * when an account had 503.
 *
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const VERIFICATION_ENGINE_VERSION = '1.1.1';

// Thresholds for flagging suspicious data
const THRESHOLDS = {
  // If API returns few posts but claims high total, flag it
  POST_COUNT_MIN_FOR_CHECK: 50,      // Only check accounts claiming 50+ posts
  POST_COUNT_RETURNED_THRESHOLD: 15, // Flag if API returned fewer than this

  // Suspiciously low post count for established accounts
  // If followers >= this and posts <= LOW_POST threshold, flag for manual verification
  LOW_POST_FOLLOWER_MIN: 500,        // Only check accounts with 500+ followers
  LOW_POST_COUNT_THRESHOLD: 25,      // Flag if posts <= this with significant followers

  // Engagement rate bounds (tourism industry: typically 1-5%)
  ENGAGEMENT_RATE_MAX: 15,           // Flag if above this (suspicious)
  ENGAGEMENT_RATE_MIN: 0.1,          // Flag if below this with large following
  ENGAGEMENT_RATE_MIN_FOLLOWERS: 5000, // Only apply min check if this many followers

  // Follower difference threshold for cross-check
  FOLLOWER_DIFF_PERCENT_THRESHOLD: 25, // Flag if >25% difference

  // Post count difference threshold
  POST_DIFF_PERCENT_THRESHOLD: 50,     // Flag if >50% difference

  // Google Places
  RATING_MIN: 1.0,
  RATING_MAX: 5.0,
  BUSINESS_NAME_SIMILARITY_THRESHOLD: 0.4,

  // SEOptimer
  SCORE_MIN: 0,
  SCORE_MAX: 100,
  LOAD_TIME_MAX_SECONDS: 60,

  // Timeouts
  CROSS_CHECK_TIMEOUT_MS: 15000
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VERIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify all assessment data before publishing
 * @param {object} data - Raw data from all API sources
 * @param {object} socialUrls - Social media URLs from client input
 * @param {string} businessName - Business name for cross-reference checks
 * @param {string} websiteUrl - Website URL for cross-reference checks
 * @returns {object} Verification result with status and discrepancies
 */
export async function verifyAssessmentData(data, socialUrls = {}, businessName = '', websiteUrl = '') {
  const { seoptData, googlePlacesData, websiteAnalysis, socialMediaData } = data;

  const result = {
    verification_status: 'auto_verified',
    verified: true,
    confidence: 'high',
    verified_at: new Date().toISOString(),
    engine_version: VERIFICATION_ENGINE_VERSION,
    platforms: {},
    discrepancies: [],
    warnings: [],
    cross_checks: []
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. VERIFY SOCIAL MEDIA DATA (highest priority - most common source of errors)
  // ─────────────────────────────────────────────────────────────────────────────
  if (socialMediaData && !socialMediaData._error) {
    const socialResult = await verifySocialMediaData(socialMediaData, socialUrls);
    result.platforms.social_media = socialResult;

    if (!socialResult.verified) {
      result.verified = false;
      result.verification_status = 'needs_manual';
      result.discrepancies.push(...socialResult.discrepancies);
    }

    if (socialResult.warnings?.length) {
      result.warnings.push(...socialResult.warnings);
      if (result.confidence === 'high') {
        result.confidence = 'medium';
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. VERIFY SEOPTIMER DATA
  // ─────────────────────────────────────────────────────────────────────────────
  if (seoptData && !seoptData._error) {
    const seoptResult = verifySEOptimerData(seoptData);
    result.platforms.seoptimer = seoptResult;

    if (!seoptResult.verified) {
      result.verified = false;
      result.verification_status = 'needs_manual';
      result.discrepancies.push(...seoptResult.discrepancies);
    }

    if (seoptResult.warnings?.length) {
      result.warnings.push(...seoptResult.warnings);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. VERIFY GOOGLE PLACES DATA
  // ─────────────────────────────────────────────────────────────────────────────
  if (googlePlacesData && !googlePlacesData._error) {
    const gpResult = verifyGooglePlacesData(googlePlacesData, businessName, websiteUrl);
    result.platforms.google_places = gpResult;

    if (!gpResult.verified) {
      result.verified = false;
      result.verification_status = 'needs_manual';
      result.discrepancies.push(...gpResult.discrepancies);
    }

    if (gpResult.warnings?.length) {
      result.warnings.push(...gpResult.warnings);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. CROSS-REFERENCE CHECKS
  // ─────────────────────────────────────────────────────────────────────────────
  const crossCheckResult = verifyCrossReferences({
    websiteUrl,
    websiteAnalysis,
    googlePlacesData,
    socialMediaData
  });

  result.cross_checks = crossCheckResult.checks;
  if (crossCheckResult.warnings?.length) {
    result.warnings.push(...crossCheckResult.warnings);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. DETERMINE FINAL STATUS
  // ─────────────────────────────────────────────────────────────────────────────

  // If we have warnings but no hard failures, reduce confidence
  if (result.warnings.length > 0 && result.verified) {
    if (result.warnings.length >= 3) {
      result.confidence = 'low';
    } else if (result.confidence === 'high') {
      result.confidence = 'medium';
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOCIAL MEDIA VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify social media data from SociaVault
 * @param {object} socialMediaData - SociaVault API response
 * @param {object} socialUrls - Original social URLs provided
 * @returns {object} Verification result for social media
 */
export async function verifySocialMediaData(socialMediaData, socialUrls = {}) {
  const result = {
    verified: true,
    checks: [],
    discrepancies: [],
    warnings: [],
    cross_check_attempted: false,
    cross_check_success: false
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // INSTAGRAM VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  const instagram = socialMediaData?.platforms?.instagram;

  // Run verification if we have Instagram data (URL is only needed for cross-check)
  if (instagram && !instagram._error) {
    result.instagram = {
      reported: {
        followers: instagram.followers,
        posts: instagram.postCount || instagram.totalPosts,
        engagement_rate: instagram.metrics?.engagementRate || instagram.engagementRate,
        posts_returned: instagram.recentPosts?.length || 0
      },
      checks: []
    };

    const followers = instagram.followers || 0;
    const totalPosts = instagram.postCount || instagram.totalPosts || 0;
    const postsReturned = instagram.recentPosts?.length || 0;
    const engagementRate = instagram.metrics?.engagementRate || instagram.engagementRate || 0;

    // Check 1: Post count sanity
    // If profile claims many posts but API only returned a few, that's suspicious
    if (totalPosts >= THRESHOLDS.POST_COUNT_MIN_FOR_CHECK &&
        postsReturned <= THRESHOLDS.POST_COUNT_RETURNED_THRESHOLD) {
      const check = {
        check: 'post_count_sanity',
        status: 'warning',
        severity: 'high',
        message: `Instagram profile shows ${totalPosts} total posts but API only returned ${postsReturned} posts. This may indicate API rate limiting, data truncation, or incorrect data.`
      };
      result.instagram.checks.push(check);
      result.warnings.push({
        platform: 'instagram',
        ...check
      });
    }

    // Check 2: Engagement rate sanity
    if (followers > 0) {
      if (engagementRate > THRESHOLDS.ENGAGEMENT_RATE_MAX) {
        result.instagram.checks.push({
          check: 'engagement_rate_high',
          status: 'warning',
          severity: 'medium',
          message: `Engagement rate ${engagementRate.toFixed(2)}% is unusually high. Typical tourism accounts see 1-5%.`
        });
        result.warnings.push({
          platform: 'instagram',
          metric: 'engagement_rate',
          value: engagementRate,
          message: `Unusually high engagement rate (${engagementRate.toFixed(2)}%)`
        });
      } else if (engagementRate < THRESHOLDS.ENGAGEMENT_RATE_MIN &&
                 followers >= THRESHOLDS.ENGAGEMENT_RATE_MIN_FOLLOWERS) {
        result.instagram.checks.push({
          check: 'engagement_rate_low',
          status: 'warning',
          severity: 'low',
          message: `Engagement rate ${engagementRate.toFixed(2)}% seems low for ${followers.toLocaleString()} followers.`
        });
      }
    }

    // Check 3: Suspiciously low post count for established accounts
    // Tourism businesses with 500+ followers typically have accumulated more than 25 posts.
    // This catches API bugs like SociaVault reporting truncated data (e.g., 12 posts when actual is 503)
    if (followers >= THRESHOLDS.LOW_POST_FOLLOWER_MIN &&
        totalPosts <= THRESHOLDS.LOW_POST_COUNT_THRESHOLD) {
      const discrepancy = {
        platform: 'instagram',
        metric: 'posts',
        reported: totalPosts,
        expected_minimum: THRESHOLDS.LOW_POST_COUNT_THRESHOLD + 1,
        severity: 'high',
        message: `Instagram shows only ${totalPosts} posts for an account with ${followers.toLocaleString()} followers. This is unusually low and may indicate incorrect data from the API. Please verify the actual post count.`
      };
      result.verified = false;
      result.discrepancies.push(discrepancy);
      result.instagram.checks.push({
        check: 'low_post_count_suspicious',
        status: 'failed',
        ...discrepancy
      });
    }

    // Check 4: Cross-check with direct fetch (if URL provided and not rate limited)
    if (socialUrls?.instagram) {
      try {
        result.cross_check_attempted = true;
        const crossCheck = await attemptInstagramCrossCheck(socialUrls.instagram);

        if (crossCheck.success) {
          result.cross_check_success = true;
          result.instagram.cross_check = crossCheck;

          // Compare followers
          if (crossCheck.followers && followers) {
            const followerDiff = Math.abs(crossCheck.followers - followers);
            const followerDiffPercent = (followerDiff / followers) * 100;

            if (followerDiffPercent > THRESHOLDS.FOLLOWER_DIFF_PERCENT_THRESHOLD) {
              result.verified = false;
              const discrepancy = {
                platform: 'instagram',
                metric: 'followers',
                reported: followers,
                actual: crossCheck.followers,
                difference_percent: Math.round(followerDiffPercent),
                severity: 'high',
                message: `Instagram followers: API reported ${followers.toLocaleString()}, but actual is ${crossCheck.followers.toLocaleString()} (${Math.round(followerDiffPercent)}% difference)`
              };
              result.discrepancies.push(discrepancy);
              result.instagram.checks.push({
                check: 'follower_cross_check',
                status: 'failed',
                ...discrepancy
              });
            }
          }

          // Compare posts
          if (crossCheck.posts && totalPosts) {
            const postDiff = Math.abs(crossCheck.posts - totalPosts);
            const postDiffPercent = (postDiff / totalPosts) * 100;

            if (postDiffPercent > THRESHOLDS.POST_DIFF_PERCENT_THRESHOLD) {
              result.verified = false;
              const discrepancy = {
                platform: 'instagram',
                metric: 'posts',
                reported: totalPosts,
                actual: crossCheck.posts,
                difference_percent: Math.round(postDiffPercent),
                severity: 'high',
                message: `Instagram posts: API reported ${totalPosts.toLocaleString()}, but actual is ${crossCheck.posts.toLocaleString()} (${Math.round(postDiffPercent)}% difference)`
              };
              result.discrepancies.push(discrepancy);
              result.instagram.checks.push({
                check: 'post_count_cross_check',
                status: 'failed',
                ...discrepancy
              });
            }
          }
        }
      } catch (e) {
        // Cross-check failed (rate limited, blocked, etc.) - continue with sanity checks only
        result.instagram.cross_check = {
          success: false,
          reason: e.message
        };
      }
    }

    result.instagram.status = result.verified ? 'passed' : 'failed';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FACEBOOK VERIFICATION (basic sanity only)
  // ─────────────────────────────────────────────────────────────────────────────
  const facebook = socialMediaData?.platforms?.facebook;
  if (socialUrls?.facebook && facebook) {
    result.facebook = {
      reported: {
        followers: facebook.followers || facebook.likes
      },
      checks: [],
      status: 'passed'
    };

    // Basic sanity: followers should be non-negative
    if (facebook.followers < 0) {
      result.facebook.checks.push({
        check: 'followers_sanity',
        status: 'error',
        message: 'Facebook followers count is negative'
      });
      result.verified = false;
      result.facebook.status = 'failed';
    }
  }

  return result;
}

/**
 * Attempt to cross-check Instagram data by fetching the profile page
 * @param {string} instagramUrl - Instagram profile URL
 * @returns {object} Cross-check result
 */
async function attemptInstagramCrossCheck(instagramUrl) {
  // Extract handle from URL
  const handleMatch = instagramUrl.match(/instagram\.com\/([^\/\?]+)/);
  if (!handleMatch) {
    return { success: false, reason: 'Could not extract handle from URL' };
  }

  const handle = handleMatch[1];

  try {
    // Attempt to fetch Instagram page
    // Note: This may be blocked by Instagram's rate limiting
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), THRESHOLDS.CROSS_CHECK_TIMEOUT_MS);

    const response = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AssessmentVerifier/1.0)',
        'Accept': 'text/html'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, reason: `HTTP ${response.status}` };
    }

    const html = await response.text();

    // Try to extract metrics from page
    // Instagram embeds data in various formats - try JSON-LD first, then meta tags
    const metrics = extractInstagramMetrics(html);

    if (metrics.followers || metrics.posts) {
      return {
        success: true,
        followers: metrics.followers,
        posts: metrics.posts,
        source: 'page_scrape'
      };
    }

    return { success: false, reason: 'Could not extract metrics from page' };

  } catch (e) {
    if (e.name === 'AbortError') {
      return { success: false, reason: 'Request timed out' };
    }
    return { success: false, reason: e.message };
  }
}

/**
 * Extract metrics from Instagram HTML page
 * @param {string} html - Page HTML
 * @returns {object} Extracted metrics
 */
function extractInstagramMetrics(html) {
  const metrics = {};

  // Try to find follower count in various formats
  // Format 1: "X followers" in meta description
  const followerMatch = html.match(/(\d[\d,\.]*[KkMm]?)\s*[Ff]ollowers/);
  if (followerMatch) {
    metrics.followers = parseMetricValue(followerMatch[1]);
  }

  // Format 2: JSON data in script tags
  const jsonMatch = html.match(/"edge_followed_by":\s*\{"count":\s*(\d+)\}/);
  if (jsonMatch) {
    metrics.followers = parseInt(jsonMatch[1], 10);
  }

  // Try to find post count
  // Format 1: "X posts" in meta description
  const postMatch = html.match(/(\d[\d,\.]*[KkMm]?)\s*[Pp]osts/);
  if (postMatch) {
    metrics.posts = parseMetricValue(postMatch[1]);
  }

  // Format 2: JSON data
  const postJsonMatch = html.match(/"edge_owner_to_timeline_media":\s*\{"count":\s*(\d+)/);
  if (postJsonMatch) {
    metrics.posts = parseInt(postJsonMatch[1], 10);
  }

  return metrics;
}

/**
 * Parse metric value that may have K/M suffix
 * @param {string} value - Value string like "1.5K" or "12,345"
 * @returns {number} Parsed number
 */
function parseMetricValue(value) {
  const cleaned = value.replace(/,/g, '');
  const match = cleaned.match(/^([\d.]+)([KkMm]?)$/);

  if (!match) return 0;

  let num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();

  if (suffix === 'K') num *= 1000;
  if (suffix === 'M') num *= 1000000;

  return Math.round(num);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEOPTIMER VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify SEOptimer data
 * @param {object} seoptData - SEOptimer API response
 * @returns {object} Verification result
 */
export function verifySEOptimerData(seoptData) {
  const result = {
    verified: true,
    checks: [],
    discrepancies: [],
    warnings: []
  };

  if (!seoptData) {
    return { verified: true, checks: [], note: 'SEOptimer data not provided' };
  }

  // Check: Performance score range (0-100)
  const desktopScore = seoptData.performance?.desktop_score;
  if (desktopScore !== null && desktopScore !== undefined) {
    if (desktopScore < THRESHOLDS.SCORE_MIN || desktopScore > THRESHOLDS.SCORE_MAX) {
      result.checks.push({
        check: 'desktop_score_range',
        status: 'error',
        message: `Desktop score ${desktopScore} is outside valid range (0-100)`
      });
      result.discrepancies.push({
        platform: 'seoptimer',
        metric: 'desktop_score',
        reported: desktopScore,
        message: `Invalid desktop score: ${desktopScore}`
      });
      result.verified = false;
    }
  }

  const mobileScore = seoptData.performance?.mobile_score;
  if (mobileScore !== null && mobileScore !== undefined) {
    if (mobileScore < THRESHOLDS.SCORE_MIN || mobileScore > THRESHOLDS.SCORE_MAX) {
      result.checks.push({
        check: 'mobile_score_range',
        status: 'error',
        message: `Mobile score ${mobileScore} is outside valid range (0-100)`
      });
      result.discrepancies.push({
        platform: 'seoptimer',
        metric: 'mobile_score',
        reported: mobileScore,
        message: `Invalid mobile score: ${mobileScore}`
      });
      result.verified = false;
    }
  }

  // Check: Load time sanity
  const loadTime = seoptData.performance?.load_time;
  if (loadTime !== null && loadTime !== undefined) {
    if (loadTime < 0) {
      result.checks.push({
        check: 'load_time_negative',
        status: 'error',
        message: `Load time ${loadTime}s is negative`
      });
      result.verified = false;
    } else if (loadTime > THRESHOLDS.LOAD_TIME_MAX_SECONDS) {
      result.checks.push({
        check: 'load_time_high',
        status: 'warning',
        message: `Load time ${loadTime}s is unusually high`
      });
      result.warnings.push({
        platform: 'seoptimer',
        metric: 'load_time',
        value: loadTime,
        message: `Unusually high load time: ${loadTime}s`
      });
    }
  }

  result.status = result.verified ? 'passed' : 'failed';
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE PLACES VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify Google Places data
 * @param {object} googlePlacesData - Google Places API response
 * @param {string} businessName - Expected business name
 * @param {string} websiteUrl - Expected website URL
 * @returns {object} Verification result
 */
export function verifyGooglePlacesData(googlePlacesData, businessName = '', websiteUrl = '') {
  const result = {
    verified: true,
    checks: [],
    discrepancies: [],
    warnings: []
  };

  if (!googlePlacesData) {
    return { verified: true, checks: [], note: 'Google Places data not provided' };
  }

  // Check: Rating range (must be 1.0-5.0)
  const rating = googlePlacesData.rating;
  if (rating !== null && rating !== undefined) {
    if (rating < THRESHOLDS.RATING_MIN || rating > THRESHOLDS.RATING_MAX) {
      result.checks.push({
        check: 'rating_range',
        status: 'error',
        message: `Rating ${rating} is outside valid range (1.0-5.0)`
      });
      result.discrepancies.push({
        platform: 'google_places',
        metric: 'rating',
        reported: rating,
        message: `Invalid rating: ${rating}`
      });
      result.verified = false;
    }
  }

  // Check: Review count sanity (non-negative)
  const reviewCount = googlePlacesData.user_ratings_total || googlePlacesData.totalReviews;
  if (reviewCount !== null && reviewCount !== undefined) {
    if (reviewCount < 0) {
      result.checks.push({
        check: 'review_count_negative',
        status: 'error',
        message: `Review count ${reviewCount} is negative`
      });
      result.discrepancies.push({
        platform: 'google_places',
        metric: 'review_count',
        reported: reviewCount,
        message: `Invalid review count: ${reviewCount}`
      });
      result.verified = false;
    }
  }

  // Check: Business name similarity (fuzzy match)
  if (businessName && googlePlacesData.name) {
    const similarity = calculateStringSimilarity(
      businessName.toLowerCase(),
      googlePlacesData.name.toLowerCase()
    );

    if (similarity < THRESHOLDS.BUSINESS_NAME_SIMILARITY_THRESHOLD) {
      result.checks.push({
        check: 'business_name_match',
        status: 'warning',
        message: `Google Places name "${googlePlacesData.name}" doesn't closely match "${businessName}" (${Math.round(similarity * 100)}% similar)`
      });
      result.warnings.push({
        platform: 'google_places',
        metric: 'business_name',
        expected: businessName,
        actual: googlePlacesData.name,
        similarity: Math.round(similarity * 100),
        message: `Business name mismatch: expected "${businessName}", got "${googlePlacesData.name}"`
      });
    }
  }

  // Check: Website URL match
  if (websiteUrl && googlePlacesData.website) {
    const expectedDomain = extractDomain(websiteUrl);
    const actualDomain = extractDomain(googlePlacesData.website);

    if (expectedDomain && actualDomain && !domainsMatch(expectedDomain, actualDomain)) {
      result.checks.push({
        check: 'website_url_match',
        status: 'warning',
        message: `Google Places website "${googlePlacesData.website}" doesn't match expected "${websiteUrl}"`
      });
      result.warnings.push({
        platform: 'google_places',
        metric: 'website',
        expected: websiteUrl,
        actual: googlePlacesData.website,
        message: `Website URL mismatch`
      });
    }
  }

  result.status = result.verified ? 'passed' : 'failed';
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-REFERENCE CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify cross-references between data sources
 * @param {object} data - All data sources
 * @returns {object} Cross-check results
 */
export function verifyCrossReferences(data) {
  const { websiteUrl, websiteAnalysis, googlePlacesData, socialMediaData } = data;
  const result = {
    checks: [],
    warnings: []
  };

  if (!websiteUrl) return result;

  const expectedDomain = extractDomain(websiteUrl);
  if (!expectedDomain) return result;

  // Check: Instagram bio URL should match website domain
  const instagramExternalUrl = socialMediaData?.platforms?.instagram?.externalUrl ||
                               socialMediaData?.platforms?.instagram?.website;
  if (instagramExternalUrl) {
    const igDomain = extractDomain(instagramExternalUrl);
    if (igDomain && !domainsMatch(expectedDomain, igDomain)) {
      result.checks.push({
        check: 'instagram_url_consistency',
        status: 'warning',
        message: `Instagram profile links to ${instagramExternalUrl}, expected domain ${expectedDomain}`
      });
      result.warnings.push({
        check: 'instagram_url_consistency',
        expected: websiteUrl,
        actual: instagramExternalUrl
      });
    }
  }

  // Check: Google Places website should match
  if (googlePlacesData?.website) {
    const gpDomain = extractDomain(googlePlacesData.website);
    if (gpDomain && !domainsMatch(expectedDomain, gpDomain)) {
      result.checks.push({
        check: 'google_places_url_consistency',
        status: 'warning',
        message: `Google Places shows ${googlePlacesData.website}, expected domain ${expectedDomain}`
      });
      result.warnings.push({
        check: 'google_places_url_consistency',
        expected: websiteUrl,
        actual: googlePlacesData.website
      });
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANUAL OVERRIDE APPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply manual overrides to social media data
 * @param {object} socialMediaData - Original SociaVault data
 * @param {object} manualOverrides - Manual corrections from user
 * @returns {object} Updated social media data
 */
export function applyManualOverrides(socialMediaData, manualOverrides) {
  if (!manualOverrides) return socialMediaData;

  const updated = JSON.parse(JSON.stringify(socialMediaData)); // Deep clone

  // Apply Instagram overrides
  if (manualOverrides.instagram && updated.platforms?.instagram) {
    const ig = updated.platforms.instagram;

    if (manualOverrides.instagram.followers !== undefined) {
      ig.followers = manualOverrides.instagram.followers;
      ig._manual_override_followers = true;
    }

    if (manualOverrides.instagram.posts !== undefined) {
      ig.postCount = manualOverrides.instagram.posts;
      ig.totalPosts = manualOverrides.instagram.posts;
      ig._manual_override_posts = true;
    }

    if (manualOverrides.instagram.engagement_rate !== undefined) {
      ig.engagementRate = manualOverrides.instagram.engagement_rate;
      if (ig.metrics) {
        ig.metrics.engagementRate = manualOverrides.instagram.engagement_rate;
      }
      ig._manual_override_engagement = true;
    }

    // Calculate posting frequency if posts provided
    if (manualOverrides.instagram.posts_per_week !== undefined) {
      ig.postingFrequency = manualOverrides.instagram.posts_per_week;
      ig._manual_override_frequency = true;
    }
  }

  // Mark data as manually verified
  updated._manually_verified = true;
  updated._verified_by = manualOverrides.verified_by;
  updated._verified_at = manualOverrides.verified_at || new Date().toISOString();

  return updated;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate string similarity using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity ratio (0-1)
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1;

  // Simple Levenshtein distance
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = matrix[len2][len1];
  return 1 - (distance / maxLen);
}

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string|null} Domain without www prefix
 */
function extractDomain(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    return null;
  }
}

/**
 * Check if two domains match (accounting for subdomains)
 * @param {string} domain1 - First domain
 * @param {string} domain2 - Second domain
 * @returns {boolean} Whether domains match
 */
function domainsMatch(domain1, domain2) {
  if (!domain1 || !domain2) return false;

  const d1 = domain1.toLowerCase();
  const d2 = domain2.toLowerCase();

  // Exact match
  if (d1 === d2) return true;

  // One contains the other (handles subdomains)
  if (d1.endsWith(`.${d2}`) || d2.endsWith(`.${d1}`)) return true;
  if (d1.includes(d2) || d2.includes(d1)) return true;

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  verifyAssessmentData,
  verifySocialMediaData,
  verifySEOptimerData,
  verifyGooglePlacesData,
  verifyCrossReferences,
  applyManualOverrides,
  VERIFICATION_ENGINE_VERSION,
  THRESHOLDS
};
