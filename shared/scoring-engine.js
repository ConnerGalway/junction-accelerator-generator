/**
 * Scoring Engine - Deterministic scoring for tourism business assessments
 *
 * This module calculates scores algorithmically based on the rubrics defined
 * in rubrics.js. All scores are reproducible - same input always produces
 * same output.
 *
 * @version 1.0.0
 */

// ES Module import for bundlers (esbuild/Netlify)
import {
  SCORING_ENGINE_VERSION,
  CATEGORY_WEIGHTS,
  MISSING_DATA_POLICY,
  RUBRICS,
  scoreToGrade,
  scoreFromThresholds
} from './rubrics.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCORING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate all scores from raw data
 * @param {object} data - Raw data from all sources
 * @param {object} data.seoptData - SEOptimer API response
 * @param {object} data.googlePlacesData - Google Places API response
 * @param {object} data.websiteAnalysis - Website scrape analysis
 * @param {object} data.socialMediaData - SociaVault API response
 * @returns {object} Complete scoring result with audit trail
 */
function calculateAllScores(data) {
  const { seoptData, googlePlacesData, websiteAnalysis, socialMediaData } = data;

  // Calculate each category score
  const categoryScores = {
    website_technical: calculateWebsiteTechnicalScore(seoptData, websiteAnalysis),
    reviews_reputation: calculateReviewsReputationScore(googlePlacesData),
    booking_conversion: calculateBookingConversionScore(websiteAnalysis),
    social_media: calculateSocialMediaScore(socialMediaData),
    guest_experience: calculateGuestExperienceScore(websiteAnalysis),
    local_visibility: calculateLocalVisibilityScore(seoptData, googlePlacesData, websiteAnalysis)
  };

  // Calculate weighted overall score
  const overall = calculateOverallScore(categoryScores);

  // Determine overall confidence
  const confidenceLevels = Object.values(categoryScores).map(c => c.confidence);
  const overallConfidence = determineOverallConfidence(confidenceLevels);

  // Build missing data flags
  const missingDataFlags = buildMissingDataFlags(data);

  return {
    version: SCORING_ENGINE_VERSION,
    calculatedAt: new Date().toISOString(),
    overall: {
      score: overall.score,
      grade: overall.grade,
      confidence: overallConfidence,
      scoreBreakdown: overall.breakdown
    },
    categories: categoryScores,
    missingDataFlags,
    audit: {
      version: SCORING_ENGINE_VERSION,
      inputsProvided: {
        seoptimer: !!(seoptData && !seoptData._error),
        googlePlaces: !!(googlePlacesData && !googlePlacesData._error),
        websiteAnalysis: !!(websiteAnalysis && !websiteAnalysis._error),
        socialMedia: !!(socialMediaData && !socialMediaData._error)
      }
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY SCORING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Website & Technical Foundation score
 */
function calculateWebsiteTechnicalScore(seoptData, websiteAnalysis) {
  const rubric = RUBRICS.website_technical;
  const breakdown = {};
  let hasData = false;

  // Desktop Speed
  if (seoptData && !seoptData._error && seoptData.performance?.desktop_score != null) {
    breakdown.desktop_speed = {
      value: seoptData.performance.desktop_score,
      score: Math.min(100, Math.max(0, seoptData.performance.desktop_score)),
      source: 'SEOptimer'
    };
    hasData = true;
  } else {
    breakdown.desktop_speed = { value: null, score: 50, source: 'unavailable' };
  }

  // Mobile Speed
  if (seoptData && !seoptData._error && seoptData.performance?.mobile_score != null) {
    breakdown.mobile_speed = {
      value: seoptData.performance.mobile_score,
      score: Math.min(100, Math.max(0, seoptData.performance.mobile_score)),
      source: 'SEOptimer'
    };
    hasData = true;
  } else {
    breakdown.mobile_speed = { value: null, score: 50, source: 'unavailable' };
  }

  // SSL/HTTPS
  if (websiteAnalysis && !websiteAnalysis._error) {
    breakdown.ssl_https = {
      value: websiteAnalysis.hasSSL,
      score: websiteAnalysis.hasSSL ? 100 : 0,
      source: 'Website Analysis'
    };
    hasData = true;
  } else {
    breakdown.ssl_https = { value: null, score: 50, source: 'unavailable' };
  }

  // Mobile Viewport
  if (websiteAnalysis && !websiteAnalysis._error) {
    breakdown.mobile_viewport = {
      value: websiteAnalysis.hasMobileViewport,
      score: websiteAnalysis.hasMobileViewport ? 100 : 20,
      source: 'Website Analysis'
    };
    hasData = true;
  } else {
    breakdown.mobile_viewport = { value: null, score: 50, source: 'unavailable' };
  }

  // Meta Tags
  if (seoptData && !seoptData._error && seoptData.seo) {
    const hasTitle = !!seoptData.seo.title;
    const hasDesc = !!seoptData.seo.description;
    let metaScore = 0;
    if (hasTitle && hasDesc) metaScore = 100;
    else if (hasTitle || hasDesc) metaScore = 50;
    else metaScore = 0;

    breakdown.meta_tags = {
      value: { title: hasTitle, description: hasDesc },
      score: metaScore,
      source: 'SEOptimer'
    };
    hasData = true;
  } else {
    breakdown.meta_tags = { value: null, score: 50, source: 'unavailable' };
  }

  // Load Time
  if (seoptData && !seoptData._error && seoptData.performance?.load_time != null) {
    const loadTime = parseFloat(seoptData.performance.load_time);
    const loadTimeScore = scoreFromThresholds(
      loadTime,
      rubric.subMetrics.load_time.thresholds,
      'descending'
    );
    breakdown.load_time = {
      value: loadTime,
      score: loadTimeScore,
      source: 'SEOptimer'
    };
    hasData = true;
  } else {
    breakdown.load_time = { value: null, score: 50, source: 'unavailable' };
  }

  // Calculate weighted score
  const weightedScore = applySubMetricWeights(breakdown, rubric.subMetrics);

  return {
    title: rubric.title,
    score: Math.round(weightedScore),
    grade: scoreToGrade(weightedScore),
    weight: rubric.weight,
    confidence: hasData ? 'high' : 'low',
    breakdown,
    dataSources: rubric.dataSources
  };
}

/**
 * Calculate Reviews & Reputation score
 */
function calculateReviewsReputationScore(googlePlacesData) {
  const rubric = RUBRICS.reviews_reputation;
  const breakdown = {};

  // Check if Google Places data is available
  if (!googlePlacesData || googlePlacesData._error) {
    return {
      title: rubric.title,
      score: MISSING_DATA_POLICY.unavailable.score,
      grade: scoreToGrade(MISSING_DATA_POLICY.unavailable.score),
      weight: rubric.weight,
      confidence: 'low',
      note: 'Google Places data unavailable - manual verification required',
      breakdown: {
        google_rating: { value: null, score: 50, source: 'unavailable' },
        review_volume: { value: null, score: 50, source: 'unavailable' },
        review_recency: { value: null, score: 50, source: 'unavailable' },
        response_rate: { value: null, score: 50, source: 'unavailable' }
      },
      dataSources: rubric.dataSources
    };
  }

  // Google Rating
  const rating = googlePlacesData.rating;
  if (rating != null) {
    const ratingScore = scoreFromThresholds(
      rating,
      rubric.subMetrics.google_rating.thresholds,
      'ascending'
    );
    breakdown.google_rating = {
      value: rating,
      score: ratingScore,
      source: 'Google Places API'
    };
  } else {
    breakdown.google_rating = { value: null, score: 50, source: 'not provided' };
  }

  // Review Volume
  const reviewCount = googlePlacesData.totalReviews;
  if (reviewCount != null) {
    const volumeScore = scoreFromThresholds(
      reviewCount,
      rubric.subMetrics.review_volume.thresholds,
      'ascending'
    );
    breakdown.review_volume = {
      value: reviewCount,
      score: volumeScore,
      source: 'Google Places API'
    };
  } else {
    breakdown.review_volume = { value: null, score: 50, source: 'not provided' };
  }

  // Review Recency
  const reviewAnalysis = googlePlacesData._reviewAnalysis;
  if (reviewAnalysis) {
    // Calculate recency score based on % of recent reviews
    const recentPercent = reviewAnalysis.totalProvided > 0
      ? (reviewAnalysis.recentCount / reviewAnalysis.totalProvided) * 100
      : 0;

    let recencyScore;
    if (recentPercent >= 80) recencyScore = 100;
    else if (recentPercent >= 60) recencyScore = 85;
    else if (recentPercent >= 40) recencyScore = 70;
    else if (recentPercent >= 20) recencyScore = 55;
    else recencyScore = 40;

    breakdown.review_recency = {
      value: {
        recentCount: reviewAnalysis.recentCount,
        totalProvided: reviewAnalysis.totalProvided,
        recentPercent: Math.round(recentPercent)
      },
      score: recencyScore,
      source: 'Google Places API'
    };
  } else {
    breakdown.review_recency = { value: null, score: 60, source: 'not analyzed' };
  }

  // Response Rate (estimated - we don't have direct access to this)
  // Use a neutral score since we can't verify owner responses
  breakdown.response_rate = {
    value: null,
    score: 60,
    source: 'not available in API',
    note: 'Owner response rate requires manual verification'
  };

  // Calculate weighted score
  const weightedScore = applySubMetricWeights(breakdown, rubric.subMetrics);

  return {
    title: rubric.title,
    score: Math.round(weightedScore),
    grade: scoreToGrade(weightedScore),
    weight: rubric.weight,
    confidence: rating != null && reviewCount != null ? 'high' : 'medium',
    breakdown,
    dataSources: rubric.dataSources
  };
}

/**
 * Calculate Online Booking & Conversion score
 */
function calculateBookingConversionScore(websiteAnalysis) {
  const rubric = RUBRICS.booking_conversion;
  const breakdown = {};

  if (!websiteAnalysis || websiteAnalysis._error) {
    return {
      title: rubric.title,
      score: MISSING_DATA_POLICY.unavailable.score,
      grade: scoreToGrade(MISSING_DATA_POLICY.unavailable.score),
      weight: rubric.weight,
      confidence: 'low',
      note: 'Website analysis unavailable',
      breakdown: {
        booking_capability: { value: null, score: 50, source: 'unavailable' },
        platform_integration: { value: null, score: 50, source: 'unavailable' },
        phone_visibility: { value: null, score: 50, source: 'unavailable' },
        pricing_visibility: { value: null, score: 50, source: 'unavailable' },
        cta_presence: { value: null, score: 50, source: 'unavailable' }
      },
      dataSources: rubric.dataSources
    };
  }

  // Booking Capability
  breakdown.booking_capability = {
    value: websiteAnalysis.hasBookingLink,
    score: websiteAnalysis.hasBookingLink ? 100 : 30,
    source: 'Website Analysis'
  };

  // Platform Integration
  const platformCount = websiteAnalysis.bookingPlatforms?.length || 0;
  const platformScore = scoreFromThresholds(
    platformCount,
    rubric.subMetrics.platform_integration.thresholds,
    'ascending'
  );
  breakdown.platform_integration = {
    value: {
      count: platformCount,
      platforms: websiteAnalysis.bookingPlatforms || []
    },
    score: platformScore,
    source: 'Website Analysis'
  };

  // Phone Visibility (with quality tier if available)
  const phoneScore = calculatePhoneVisibilityScore(websiteAnalysis);
  breakdown.phone_visibility = {
    value: websiteAnalysis.phoneQuality || websiteAnalysis.hasPhone,
    score: phoneScore,
    source: 'Website Analysis',
    details: websiteAnalysis.phoneQuality?.locations
  };

  // Pricing Visibility (with transparency tier if available)
  const pricingScore = calculatePricingVisibilityScore(websiteAnalysis);
  breakdown.pricing_visibility = {
    value: websiteAnalysis.pricingQuality || websiteAnalysis.hasPricing,
    score: pricingScore,
    source: 'Website Analysis',
    details: websiteAnalysis.pricingQuality?.transparency
  };

  // CTA Presence (with prominence tier if available)
  const ctaScore = calculateCTAScore(websiteAnalysis);
  breakdown.cta_presence = {
    value: websiteAnalysis.ctaQuality || websiteAnalysis.hasBookingLink,
    score: ctaScore,
    source: 'Website Analysis',
    details: websiteAnalysis.ctaQuality?.prominence
  };

  // Calculate weighted score
  const weightedScore = applySubMetricWeights(breakdown, rubric.subMetrics);

  return {
    title: rubric.title,
    score: Math.round(weightedScore),
    grade: scoreToGrade(weightedScore),
    weight: rubric.weight,
    confidence: 'high',
    breakdown,
    dataSources: rubric.dataSources
  };
}

/**
 * Calculate Social Media & Content score
 */
function calculateSocialMediaScore(socialMediaData) {
  const rubric = RUBRICS.social_media;
  const breakdown = {};

  if (!socialMediaData || socialMediaData._error) {
    return {
      title: rubric.title,
      score: MISSING_DATA_POLICY.unavailable.score,
      grade: scoreToGrade(MISSING_DATA_POLICY.unavailable.score),
      weight: rubric.weight,
      confidence: 'low',
      note: 'Social media data unavailable',
      breakdown: {
        total_followers: { value: null, score: 50, source: 'unavailable' },
        engagement_rate: { value: null, score: 50, source: 'unavailable' },
        posting_frequency: { value: null, score: 50, source: 'unavailable' },
        platform_presence: { value: null, score: 50, source: 'unavailable' },
        content_quality: { value: null, score: 50, source: 'unavailable' }
      },
      dataSources: rubric.dataSources
    };
  }

  // Total Followers
  const totalFollowers = socialMediaData.summary?.totalFollowers || 0;
  const followerScore = scoreFromThresholds(
    totalFollowers,
    rubric.subMetrics.total_followers.thresholds,
    'ascending'
  );
  breakdown.total_followers = {
    value: totalFollowers,
    score: followerScore,
    source: 'SociaVault'
  };

  // Engagement Rate (Instagram primary)
  const instagram = socialMediaData.platforms?.instagram;
  const engagementRate = instagram?.metrics?.engagementRate || 0;
  const engagementScore = scoreFromThresholds(
    engagementRate,
    rubric.subMetrics.engagement_rate.thresholds,
    'ascending'
  );
  breakdown.engagement_rate = {
    value: engagementRate,
    score: engagementScore,
    source: instagram ? 'SociaVault (Instagram)' : 'unavailable'
  };

  // Posting Frequency
  const postingFrequency = instagram?.metrics?.postingFrequency || 0;
  const frequencyScore = scoreFromThresholds(
    postingFrequency,
    rubric.subMetrics.posting_frequency.thresholds,
    'ascending'
  );
  breakdown.posting_frequency = {
    value: postingFrequency,
    score: frequencyScore,
    source: instagram ? 'SociaVault (Instagram)' : 'unavailable'
  };

  // Platform Presence
  const platformsAnalyzed = socialMediaData.summary?.platformsAnalyzed || [];
  const platformCount = platformsAnalyzed.length;
  const platformScore = scoreFromThresholds(
    platformCount,
    rubric.subMetrics.platform_presence.thresholds,
    'ascending'
  );
  breakdown.platform_presence = {
    value: {
      count: platformCount,
      platforms: platformsAnalyzed
    },
    score: platformScore,
    source: 'SociaVault'
  };

  // Content Quality (based on video/reel presence)
  const contentQualityScore = calculateContentQualityScore(socialMediaData);
  breakdown.content_quality = {
    value: contentQualityScore.details,
    score: contentQualityScore.score,
    source: 'SociaVault'
  };

  // Calculate weighted score
  const weightedScore = applySubMetricWeights(breakdown, rubric.subMetrics);

  return {
    title: rubric.title,
    score: Math.round(weightedScore),
    grade: scoreToGrade(weightedScore),
    weight: rubric.weight,
    confidence: totalFollowers > 0 ? 'high' : 'medium',
    breakdown,
    dataSources: rubric.dataSources
  };
}

/**
 * Calculate Digital Guest Experience score
 */
function calculateGuestExperienceScore(websiteAnalysis) {
  const rubric = RUBRICS.guest_experience;
  const breakdown = {};

  if (!websiteAnalysis || websiteAnalysis._error) {
    return {
      title: rubric.title,
      score: MISSING_DATA_POLICY.unavailable.score,
      grade: scoreToGrade(MISSING_DATA_POLICY.unavailable.score),
      weight: rubric.weight,
      confidence: 'low',
      note: 'Website analysis unavailable',
      breakdown: {
        hours_displayed: { value: null, score: 50, source: 'unavailable' },
        directions_map: { value: null, score: 50, source: 'unavailable' },
        parking_info: { value: null, score: 50, source: 'unavailable' },
        accessibility_info: { value: null, score: 50, source: 'unavailable' },
        multi_language: { value: null, score: 50, source: 'unavailable' }
      },
      dataSources: rubric.dataSources
    };
  }

  // Hours Displayed (with completeness tier if available)
  const hoursScore = calculateHoursScore(websiteAnalysis);
  breakdown.hours_displayed = {
    value: websiteAnalysis.hoursQuality || websiteAnalysis.hasHours,
    score: hoursScore,
    source: 'Website Analysis',
    details: websiteAnalysis.hoursQuality?.completeness
  };

  // Directions/Map
  breakdown.directions_map = {
    value: websiteAnalysis.hasDirections,
    score: websiteAnalysis.hasDirections ? 100 : 35,
    source: 'Website Analysis'
  };

  // Parking Info
  breakdown.parking_info = {
    value: websiteAnalysis.hasParking,
    score: websiteAnalysis.hasParking ? 100 : 50,
    source: 'Website Analysis'
  };

  // Accessibility Info
  breakdown.accessibility_info = {
    value: websiteAnalysis.hasAccessibility,
    score: websiteAnalysis.hasAccessibility ? 100 : 50,
    source: 'Website Analysis'
  };

  // Multi-language
  breakdown.multi_language = {
    value: websiteAnalysis.hasMultiLanguage,
    score: websiteAnalysis.hasMultiLanguage ? 100 : 55,
    source: 'Website Analysis'
  };

  // Calculate weighted score
  const weightedScore = applySubMetricWeights(breakdown, rubric.subMetrics);

  return {
    title: rubric.title,
    score: Math.round(weightedScore),
    grade: scoreToGrade(weightedScore),
    weight: rubric.weight,
    confidence: 'high',
    breakdown,
    dataSources: rubric.dataSources
  };
}

/**
 * Calculate Local Visibility score
 */
function calculateLocalVisibilityScore(seoptData, googlePlacesData, websiteAnalysis) {
  const rubric = RUBRICS.local_visibility;
  const breakdown = {};

  // GBP Claimed (inferred from Google Places data availability)
  if (googlePlacesData && !googlePlacesData._error && googlePlacesData.totalReviews > 0) {
    breakdown.gbp_claimed = {
      value: true,
      score: 100,
      source: 'Google Places API',
      note: 'Business found in Google Places with reviews'
    };
  } else if (googlePlacesData && !googlePlacesData._error) {
    breakdown.gbp_claimed = {
      value: true,
      score: 70,
      source: 'Google Places API',
      note: 'Business found but limited activity'
    };
  } else {
    breakdown.gbp_claimed = {
      value: false,
      score: 30,
      source: 'unavailable',
      note: 'Could not verify GBP presence'
    };
  }

  // NAP Consistency (simplified - check if address/phone present)
  const hasAddress = websiteAnalysis?.hasAddress || false;
  const hasPhone = websiteAnalysis?.hasPhone || false;
  const napScore = (hasAddress && hasPhone) ? 90 : (hasAddress || hasPhone) ? 60 : 30;

  breakdown.nap_consistency = {
    value: { hasAddress, hasPhone },
    score: napScore,
    source: 'Website Analysis'
  };

  // Local Keywords (from SEOptimer or website analysis)
  // This is a simplified check - full implementation would analyze meta content
  const hasLocalSignals = websiteAnalysis?.hasAddress || googlePlacesData?.name;
  breakdown.local_keywords = {
    value: hasLocalSignals,
    score: hasLocalSignals ? 75 : 40,
    source: 'combined',
    note: 'Local signals detected from address/business name'
  };

  // Calculate weighted score
  const weightedScore = applySubMetricWeights(breakdown, rubric.subMetrics);

  // Determine confidence based on data availability
  const hasGoogleData = googlePlacesData && !googlePlacesData._error;
  const hasWebsiteData = websiteAnalysis && !websiteAnalysis._error;

  return {
    title: rubric.title,
    score: Math.round(weightedScore),
    grade: scoreToGrade(weightedScore),
    weight: rubric.weight,
    confidence: hasGoogleData && hasWebsiteData ? 'high' : 'medium',
    breakdown,
    dataSources: rubric.dataSources
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply sub-metric weights to calculate category score
 */
function applySubMetricWeights(breakdown, subMetricDefs) {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [metricKey, metricDef] of Object.entries(subMetricDefs)) {
    const metricData = breakdown[metricKey];
    if (metricData && typeof metricData.score === 'number') {
      weightedSum += metricData.score * metricDef.weight;
      totalWeight += metricDef.weight;
    }
  }

  // Normalize if not all weights were used
  if (totalWeight > 0 && totalWeight < 1) {
    weightedSum = weightedSum / totalWeight;
  }

  return weightedSum;
}

/**
 * Calculate overall weighted score from category scores
 */
function calculateOverallScore(categoryScores) {
  let weightedSum = 0;
  const breakdown = {};

  for (const [categoryKey, categoryData] of Object.entries(categoryScores)) {
    const weight = CATEGORY_WEIGHTS[categoryKey];
    const contribution = categoryData.score * weight;

    weightedSum += contribution;

    breakdown[categoryKey] = {
      score: categoryData.score,
      weight: weight,
      contribution: Math.round(contribution * 100) / 100
    };
  }

  const overallScore = Math.round(weightedSum);

  return {
    score: overallScore,
    grade: scoreToGrade(overallScore),
    breakdown
  };
}

/**
 * Determine overall confidence level
 */
function determineOverallConfidence(confidenceLevels) {
  const lowCount = confidenceLevels.filter(c => c === 'low').length;
  const highCount = confidenceLevels.filter(c => c === 'high').length;

  if (lowCount >= 3) return 'low';
  if (highCount >= 4) return 'high';
  return 'medium';
}

/**
 * Build list of missing data flags
 */
function buildMissingDataFlags(data) {
  const flags = [];

  if (!data.seoptData || data.seoptData._error) {
    flags.push('seoptimer_unavailable');
  }
  if (!data.googlePlacesData || data.googlePlacesData._error) {
    flags.push('google_places_unavailable');
  }
  if (!data.websiteAnalysis || data.websiteAnalysis._error) {
    flags.push('website_analysis_unavailable');
  }
  if (!data.socialMediaData || data.socialMediaData._error) {
    flags.push('social_media_unavailable');
  }

  return flags;
}

/**
 * Calculate phone visibility score with quality tiers
 * Uses enhanced phoneQuality data if available
 */
function calculatePhoneVisibilityScore(websiteAnalysis) {
  // Use enhanced quality tier if available
  if (websiteAnalysis.phoneQuality) {
    const quality = websiteAnalysis.phoneQuality;
    if (!quality.found) return 20;
    return quality.score; // Use the quality score directly
  }

  // Fallback for legacy data
  if (!websiteAnalysis.hasPhone) {
    return 20; // No phone found
  }

  return 85; // Basic phone detected
}

/**
 * Calculate pricing visibility score with transparency tiers
 * Uses enhanced pricingQuality data if available
 */
function calculatePricingVisibilityScore(websiteAnalysis) {
  // Use enhanced quality tier if available
  if (websiteAnalysis.pricingQuality) {
    const quality = websiteAnalysis.pricingQuality;
    if (!quality.found) return 25;
    return quality.score; // Use the quality score directly
  }

  // Fallback for legacy data
  if (!websiteAnalysis.hasPricing) {
    return 45;
  }

  return 100;
}

/**
 * Calculate CTA score with prominence tiers
 * Uses enhanced ctaQuality data if available
 */
function calculateCTAScore(websiteAnalysis) {
  // Use enhanced quality tier if available
  if (websiteAnalysis.ctaQuality) {
    const quality = websiteAnalysis.ctaQuality;
    if (!quality.found) return 25;
    return quality.score; // Use the quality score directly
  }

  // Fallback for legacy data
  if (websiteAnalysis.hasBookingLink) {
    return 90;
  }

  return 40;
}

/**
 * Calculate hours visibility score with completeness tiers
 * Uses enhanced hoursQuality data if available
 */
function calculateHoursScore(websiteAnalysis) {
  // Use enhanced quality tier if available
  if (websiteAnalysis.hoursQuality) {
    const quality = websiteAnalysis.hoursQuality;
    if (!quality.found) return 30;
    return quality.score; // Use the quality score directly
  }

  // Fallback for legacy data
  if (websiteAnalysis.hasHours) {
    return 80;
  }

  return 40;
}

/**
 * Calculate content quality score based on video presence
 */
function calculateContentQualityScore(socialMediaData) {
  const instagram = socialMediaData?.platforms?.instagram;

  if (!instagram || !instagram.contentMix) {
    return {
      score: 50,
      details: { note: 'Content mix data unavailable' }
    };
  }

  const contentMix = instagram.contentMix;
  const total = (contentMix.images || 0) + (contentMix.carousels || 0) + (contentMix.reels || 0);

  if (total === 0) {
    return { score: 40, details: { note: 'No content detected' } };
  }

  const reelPercent = ((contentMix.reels || 0) / total) * 100;

  // Score based on video/reel presence (30-50% is optimal for tourism)
  let score;
  if (reelPercent >= 30 && reelPercent <= 50) score = 100;
  else if (reelPercent >= 20 && reelPercent < 30) score = 85;
  else if (reelPercent >= 50 && reelPercent < 70) score = 80;
  else if (reelPercent >= 10 && reelPercent < 20) score = 70;
  else if (reelPercent > 70) score = 65;
  else score = 55; // Less than 10% video

  return {
    score,
    details: {
      images: contentMix.images || 0,
      carousels: contentMix.carousels || 0,
      reels: contentMix.reels || 0,
      reelPercent: Math.round(reelPercent)
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateAllScores,
    calculateWebsiteTechnicalScore,
    calculateReviewsReputationScore,
    calculateBookingConversionScore,
    calculateSocialMediaScore,
    calculateGuestExperienceScore,
    calculateLocalVisibilityScore,
    calculateOverallScore,
    applySubMetricWeights,
    determineOverallConfidence,
    buildMissingDataFlags,
    calculatePhoneVisibilityScore,
    calculateContentQualityScore
  };
}

// Browser / ES Modules (window global)
if (typeof window !== 'undefined') {
  window.JunctionScoringEngine = {
    calculateAllScores,
    calculateWebsiteTechnicalScore,
    calculateReviewsReputationScore,
    calculateBookingConversionScore,
    calculateSocialMediaScore,
    calculateGuestExperienceScore,
    calculateLocalVisibilityScore
  };
}

// ES Module named exports (for bundlers like esbuild)
export {
  calculateAllScores,
  calculateWebsiteTechnicalScore,
  calculateReviewsReputationScore,
  calculateBookingConversionScore,
  calculateSocialMediaScore,
  calculateGuestExperienceScore,
  calculateLocalVisibilityScore,
  calculateOverallScore,
  applySubMetricWeights,
  determineOverallConfidence,
  buildMissingDataFlags,
  calculatePhoneVisibilityScore,
  calculateContentQualityScore
};
