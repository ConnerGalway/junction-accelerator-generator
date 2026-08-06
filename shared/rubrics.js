/**
 * Rubrics Module - Scoring thresholds and benchmarks for tourism business assessments
 *
 * This module defines all scoring rules used by the deterministic scoring engine.
 * All scores are calculated algorithmically based on these thresholds.
 *
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING ENGINE VERSION - Update when rubrics change
// ═══════════════════════════════════════════════════════════════════════════════

const SCORING_ENGINE_VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY WEIGHTS - Must sum to 1.0
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_WEIGHTS = {
  website_technical: 0.15,    // 15% - Technical foundation
  reviews_reputation: 0.25,   // 25% - Reviews & reputation (highest weight)
  booking_conversion: 0.20,   // 20% - Booking & conversion capability
  social_media: 0.20,         // 20% - Social presence & engagement
  guest_experience: 0.10,     // 10% - Digital guest experience
  local_visibility: 0.10      // 10% - Local SEO & visibility
};

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE THRESHOLDS - Letter grade boundaries
// ═══════════════════════════════════════════════════════════════════════════════

const GRADE_THRESHOLDS = [
  { grade: 'A+', min: 95, max: 100 },
  { grade: 'A',  min: 90, max: 94.99 },
  { grade: 'A-', min: 87, max: 89.99 },
  { grade: 'B+', min: 83, max: 86.99 },
  { grade: 'B',  min: 80, max: 82.99 },
  { grade: 'B-', min: 77, max: 79.99 },
  { grade: 'C+', min: 73, max: 76.99 },
  { grade: 'C',  min: 70, max: 72.99 },
  { grade: 'C-', min: 67, max: 69.99 },
  { grade: 'D+', min: 63, max: 66.99 },
  { grade: 'D',  min: 60, max: 62.99 },
  { grade: 'D-', min: 57, max: 59.99 },
  { grade: 'F',  min: 0,  max: 56.99 }
];

// ═══════════════════════════════════════════════════════════════════════════════
// MISSING DATA POLICY
// ═══════════════════════════════════════════════════════════════════════════════

const MISSING_DATA_POLICY = {
  // When data source is completely unavailable
  unavailable: {
    score: 50,
    confidence: 'low',
    note: 'Data unavailable - manual verification required'
  },
  // When data source returned an error
  error: {
    score: 50,
    confidence: 'low',
    note: 'Data fetch failed - manual verification required'
  },
  // When data source returned null/empty
  empty: {
    score: 40,
    confidence: 'low',
    note: 'No data found - may indicate missing presence'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY RUBRICS - Detailed scoring thresholds for each category
// ═══════════════════════════════════════════════════════════════════════════════

const RUBRICS = {

  // ─────────────────────────────────────────────────────────────────────────────
  // WEBSITE & TECHNICAL FOUNDATION (15% of overall)
  // ─────────────────────────────────────────────────────────────────────────────
  website_technical: {
    title: 'Website & Technical Foundation',
    weight: 0.15,
    dataSources: ['SEOptimer', 'Website Analysis'],

    subMetrics: {
      // Desktop page speed (from SEOptimer)
      desktop_speed: {
        weight: 0.20,
        source: 'seoptimer.performance.desktop_score',
        type: 'direct', // Use value directly as score (0-100)
        benchmark: 'Tourism average: 60-70'
      },

      // Mobile page speed (from SEOptimer) - weighted higher for tourism
      mobile_speed: {
        weight: 0.30,
        source: 'seoptimer.performance.mobile_score',
        type: 'direct',
        benchmark: 'Tourism average: 50-60. Mobile critical for tourists on-the-go.'
      },

      // SSL/HTTPS security
      ssl_https: {
        weight: 0.15,
        source: 'websiteAnalysis.hasSSL',
        type: 'boolean',
        trueScore: 100,
        falseScore: 0,
        benchmark: 'Required for trust and bookings'
      },

      // Mobile viewport configured
      mobile_viewport: {
        weight: 0.10,
        source: 'websiteAnalysis.hasMobileViewport',
        type: 'boolean',
        trueScore: 100,
        falseScore: 20,
        benchmark: 'Essential for mobile experience'
      },

      // Meta tags present (title + description)
      meta_tags: {
        weight: 0.15,
        source: 'seoptimer.seo',
        type: 'custom', // Custom calculation function
        calculator: 'calculateMetaTagsScore',
        benchmark: 'Both title and description required for search visibility'
      },

      // Page load time
      load_time: {
        weight: 0.10,
        source: 'seoptimer.performance.load_time',
        type: 'threshold',
        thresholds: [
          { max: 2, score: 100 },    // Under 2 seconds = excellent
          { max: 3, score: 85 },     // 2-3 seconds = good
          { max: 4, score: 70 },     // 3-4 seconds = acceptable
          { max: 5, score: 55 },     // 4-5 seconds = poor
          { max: 6, score: 40 },     // 5-6 seconds = very poor
          { max: Infinity, score: 25 } // Over 6 seconds = critical
        ],
        benchmark: 'Under 3 seconds recommended. 53% abandon after 3s.'
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // REVIEWS & REPUTATION (25% of overall)
  // ─────────────────────────────────────────────────────────────────────────────
  reviews_reputation: {
    title: 'Reviews & Reputation',
    weight: 0.25,
    dataSources: ['Google Places API'],

    subMetrics: {
      // Google rating (0-5 scale)
      google_rating: {
        weight: 0.40,
        source: 'googlePlacesData.rating',
        type: 'threshold',
        thresholds: [
          { min: 4.9, score: 98 },   // 4.9-5.0 = exceptional
          { min: 4.7, score: 92 },   // 4.7-4.89 = excellent
          { min: 4.5, score: 85 },   // 4.5-4.69 = very good
          { min: 4.3, score: 78 },   // 4.3-4.49 = good
          { min: 4.0, score: 70 },   // 4.0-4.29 = acceptable
          { min: 3.7, score: 58 },   // 3.7-3.99 = below average
          { min: 3.5, score: 48 },   // 3.5-3.69 = concerning
          { min: 3.0, score: 35 },   // 3.0-3.49 = poor
          { min: 0, score: 20 }      // Below 3.0 = critical
        ],
        benchmark: 'Tourism standard: 4.0 acceptable, 4.5+ excellent'
      },

      // Review volume (total count)
      review_volume: {
        weight: 0.30,
        source: 'googlePlacesData.totalReviews',
        type: 'threshold',
        thresholds: [
          { min: 500, score: 100 },  // 500+ = authority
          { min: 300, score: 92 },   // 300-499 = established
          { min: 150, score: 82 },   // 150-299 = growing
          { min: 75, score: 68 },    // 75-149 = developing
          { min: 30, score: 52 },    // 30-74 = early stage
          { min: 10, score: 38 },    // 10-29 = limited proof
          { min: 0, score: 20 }      // Under 10 = critical gap
        ],
        benchmark: '100+ builds trust, 200+ establishes authority'
      },

      // Review recency (% of reviews from past 18 months)
      review_recency: {
        weight: 0.20,
        source: 'googlePlacesData._reviewAnalysis',
        type: 'custom',
        calculator: 'calculateReviewRecencyScore',
        benchmark: 'Fresh reviews signal active business'
      },

      // Owner response rate (estimated from review patterns)
      response_rate: {
        weight: 0.10,
        source: 'googlePlacesData.recentReviews',
        type: 'custom',
        calculator: 'calculateResponseRateScore',
        benchmark: 'Responding shows guest care'
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ONLINE BOOKING & CONVERSION (20% of overall)
  // ─────────────────────────────────────────────────────────────────────────────
  booking_conversion: {
    title: 'Online Booking & Conversion',
    weight: 0.20,
    dataSources: ['Website Analysis'],

    subMetrics: {
      // Booking capability present
      booking_capability: {
        weight: 0.35,
        source: 'websiteAnalysis.hasBookingLink',
        type: 'boolean',
        trueScore: 100,
        falseScore: 30,
        benchmark: 'Every tourism business needs clear booking path'
      },

      // Booking platform integration count
      platform_integration: {
        weight: 0.15,
        source: 'websiteAnalysis.bookingPlatforms',
        type: 'threshold',
        thresholds: [
          { min: 3, score: 100 },   // 3+ platforms = excellent
          { min: 2, score: 85 },    // 2 platforms = good
          { min: 1, score: 70 },    // 1 platform = basic
          { min: 0, score: 40 }     // No platforms = gap
        ],
        benchmark: 'Multiple booking channels increase reach'
      },

      // Phone visibility and quality
      phone_visibility: {
        weight: 0.20,
        source: 'websiteAnalysis',
        type: 'custom',
        calculator: 'calculatePhoneVisibilityScore',
        benchmark: 'Phone should be visible in header/footer'
      },

      // Pricing information visible
      pricing_visibility: {
        weight: 0.15,
        source: 'websiteAnalysis.hasPricing',
        type: 'boolean',
        trueScore: 100,
        falseScore: 45,
        benchmark: 'Transparent pricing builds trust'
      },

      // Call-to-action clarity
      cta_presence: {
        weight: 0.15,
        source: 'websiteAnalysis.hasBookingLink',
        type: 'custom',
        calculator: 'calculateCTAScore',
        benchmark: 'Clear CTAs drive conversions'
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SOCIAL MEDIA & CONTENT (20% of overall)
  // ─────────────────────────────────────────────────────────────────────────────
  social_media: {
    title: 'Social Media & Content',
    weight: 0.20,
    dataSources: ['SociaVault API'],

    subMetrics: {
      // Total followers across platforms
      total_followers: {
        weight: 0.25,
        source: 'socialMediaData.summary.totalFollowers',
        type: 'threshold',
        thresholds: [
          { min: 50000, score: 100 },  // 50k+ = strong authority
          { min: 20000, score: 92 },   // 20k-50k = established
          { min: 10000, score: 85 },   // 10k-20k = growing
          { min: 5000, score: 75 },    // 5k-10k = developing
          { min: 2000, score: 65 },    // 2k-5k = emerging
          { min: 1000, score: 55 },    // 1k-2k = early stage
          { min: 500, score: 45 },     // 500-1k = starting
          { min: 0, score: 30 }        // Under 500 = needs work
        ],
        benchmark: 'Local tourism: 1k+ good, 5k+ strong'
      },

      // Average engagement rate (Instagram primary)
      engagement_rate: {
        weight: 0.30,
        source: 'socialMediaData.platforms.instagram.metrics.engagementRate',
        type: 'threshold',
        thresholds: [
          { min: 6, score: 100 },    // 6%+ = exceptional
          { min: 4, score: 90 },     // 4-6% = excellent
          { min: 3, score: 80 },     // 3-4% = good
          { min: 2, score: 70 },     // 2-3% = average
          { min: 1, score: 55 },     // 1-2% = below average
          { min: 0.5, score: 40 },   // 0.5-1% = low
          { min: 0, score: 25 }      // Under 0.5% = very low
        ],
        benchmark: 'Tourism: 1-3% average, 3-6% good, 6%+ excellent'
      },

      // Posting frequency (posts per week)
      posting_frequency: {
        weight: 0.20,
        source: 'socialMediaData.platforms.instagram.metrics.postingFrequency',
        type: 'threshold',
        thresholds: [
          { min: 5, score: 100 },    // 5+/week = very active
          { min: 3, score: 85 },     // 3-5/week = active
          { min: 2, score: 70 },     // 2-3/week = consistent
          { min: 1, score: 55 },     // 1-2/week = sporadic
          { min: 0.5, score: 40 },   // Bi-weekly = infrequent
          { min: 0, score: 25 }      // Less = inactive
        ],
        benchmark: '3-5 posts/week recommended for tourism'
      },

      // Platform presence (number of active platforms)
      platform_presence: {
        weight: 0.15,
        source: 'socialMediaData.summary.platformsAnalyzed',
        type: 'threshold',
        thresholds: [
          { min: 4, score: 100 },   // 4+ platforms = comprehensive
          { min: 3, score: 85 },    // 3 platforms = solid
          { min: 2, score: 70 },    // 2 platforms = basic
          { min: 1, score: 50 },    // 1 platform = limited
          { min: 0, score: 20 }     // No presence = critical
        ],
        benchmark: 'Tourism needs 2-3 platforms minimum'
      },

      // Content quality (video presence as proxy)
      content_quality: {
        weight: 0.10,
        source: 'socialMediaData',
        type: 'custom',
        calculator: 'calculateContentQualityScore',
        benchmark: 'Reels/video should be 30-50% of content'
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // DIGITAL GUEST EXPERIENCE (10% of overall)
  // ─────────────────────────────────────────────────────────────────────────────
  guest_experience: {
    title: 'Digital Guest Experience',
    weight: 0.10,
    dataSources: ['Website Analysis'],

    subMetrics: {
      // Hours displayed
      hours_displayed: {
        weight: 0.25,
        source: 'websiteAnalysis.hasHours',
        type: 'boolean',
        trueScore: 100,
        falseScore: 30,
        benchmark: 'Hours must be easily findable'
      },

      // Directions/map available
      directions_map: {
        weight: 0.25,
        source: 'websiteAnalysis.hasDirections',
        type: 'boolean',
        trueScore: 100,
        falseScore: 35,
        benchmark: 'Map embed or directions link expected'
      },

      // Parking information
      parking_info: {
        weight: 0.15,
        source: 'websiteAnalysis.hasParking',
        type: 'boolean',
        trueScore: 100,
        falseScore: 50,
        benchmark: 'Parking info reduces visitor friction'
      },

      // Accessibility information
      accessibility_info: {
        weight: 0.15,
        source: 'websiteAnalysis.hasAccessibility',
        type: 'boolean',
        trueScore: 100,
        falseScore: 50,
        benchmark: 'Accessibility shows inclusivity'
      },

      // Multi-language support
      multi_language: {
        weight: 0.20,
        source: 'websiteAnalysis.hasMultiLanguage',
        type: 'boolean',
        trueScore: 100,
        falseScore: 55,
        benchmark: 'Multi-language helps international visitors'
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LOCAL VISIBILITY (10% of overall)
  // ─────────────────────────────────────────────────────────────────────────────
  local_visibility: {
    title: 'Local Visibility',
    weight: 0.10,
    dataSources: ['SEOptimer', 'Google Places', 'Website Analysis'],

    subMetrics: {
      // Google Business Profile claimed (inferred from Google Places data)
      gbp_claimed: {
        weight: 0.40,
        source: 'googlePlacesData',
        type: 'custom',
        calculator: 'calculateGBPClaimedScore',
        benchmark: 'Claimed GBP essential for local search'
      },

      // NAP consistency (Name, Address, Phone)
      nap_consistency: {
        weight: 0.30,
        source: 'combined',
        type: 'custom',
        calculator: 'calculateNAPConsistencyScore',
        benchmark: 'Consistent info across web builds trust'
      },

      // Local keywords presence
      local_keywords: {
        weight: 0.30,
        source: 'seoptimer',
        type: 'custom',
        calculator: 'calculateLocalKeywordsScore',
        benchmark: 'Location terms help local discovery'
      }
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get grade letter from numeric score
 * @param {number} score - Score between 0-100
 * @returns {string} Letter grade (A+ through F)
 */
function scoreToGrade(score) {
  if (typeof score !== 'number' || isNaN(score)) {
    return 'N/A';
  }

  // Clamp score to 0-100
  const clampedScore = Math.max(0, Math.min(100, score));

  for (const threshold of GRADE_THRESHOLDS) {
    if (clampedScore >= threshold.min && clampedScore <= threshold.max) {
      return threshold.grade;
    }
  }

  return 'F'; // Fallback
}

/**
 * Get all category keys
 * @returns {string[]} Array of category keys
 */
function getCategoryKeys() {
  return Object.keys(CATEGORY_WEIGHTS);
}

/**
 * Validate that all weights sum correctly
 * @returns {{ valid: boolean, issues: string[] }}
 */
function validateWeights() {
  const issues = [];

  // Check category weights sum to 1.0
  const categorySum = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);
  if (Math.abs(categorySum - 1.0) > 0.001) {
    issues.push(`Category weights sum to ${categorySum}, expected 1.0`);
  }

  // Check each category's sub-metric weights sum to 1.0
  for (const [categoryKey, category] of Object.entries(RUBRICS)) {
    const subMetricSum = Object.values(category.subMetrics)
      .reduce((sum, metric) => sum + metric.weight, 0);

    if (Math.abs(subMetricSum - 1.0) > 0.001) {
      issues.push(`${categoryKey} sub-metric weights sum to ${subMetricSum}, expected 1.0`);
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Get rubric for a specific category
 * @param {string} categoryKey - Category key (e.g., 'reviews_reputation')
 * @returns {object|null} Rubric object or null if not found
 */
function getRubric(categoryKey) {
  return RUBRICS[categoryKey] || null;
}

/**
 * Get sub-metric definition
 * @param {string} categoryKey - Category key
 * @param {string} metricKey - Sub-metric key
 * @returns {object|null} Sub-metric definition or null
 */
function getSubMetric(categoryKey, metricKey) {
  const rubric = RUBRICS[categoryKey];
  if (!rubric || !rubric.subMetrics) return null;
  return rubric.subMetrics[metricKey] || null;
}

/**
 * Calculate score from threshold-based rubric
 * @param {number} value - The value to score
 * @param {object[]} thresholds - Array of threshold objects
 * @param {string} direction - 'ascending' (higher is better) or 'descending' (lower is better)
 * @returns {number} Score 0-100
 */
function scoreFromThresholds(value, thresholds, direction = 'ascending') {
  if (typeof value !== 'number' || isNaN(value)) {
    return MISSING_DATA_POLICY.empty.score;
  }

  if (direction === 'ascending') {
    // Higher value = higher score (e.g., review count)
    for (const threshold of thresholds) {
      if (value >= threshold.min) {
        return threshold.score;
      }
    }
  } else {
    // Lower value = higher score (e.g., load time)
    for (const threshold of thresholds) {
      if (value <= threshold.max) {
        return threshold.score;
      }
    }
  }

  // Return lowest score if no threshold matched
  return thresholds[thresholds.length - 1]?.score || 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SCORING_ENGINE_VERSION,
    CATEGORY_WEIGHTS,
    GRADE_THRESHOLDS,
    MISSING_DATA_POLICY,
    RUBRICS,
    scoreToGrade,
    getCategoryKeys,
    validateWeights,
    getRubric,
    getSubMetric,
    scoreFromThresholds
  };
}

// Browser / ES Modules (window global)
if (typeof window !== 'undefined') {
  window.JunctionRubrics = {
    SCORING_ENGINE_VERSION,
    CATEGORY_WEIGHTS,
    GRADE_THRESHOLDS,
    MISSING_DATA_POLICY,
    RUBRICS,
    scoreToGrade,
    getCategoryKeys,
    validateWeights,
    getRubric,
    getSubMetric,
    scoreFromThresholds
  };
}

// ES Module named exports (for bundlers like esbuild)
export {
  SCORING_ENGINE_VERSION,
  CATEGORY_WEIGHTS,
  GRADE_THRESHOLDS,
  MISSING_DATA_POLICY,
  RUBRICS,
  scoreToGrade,
  getCategoryKeys,
  validateWeights,
  getRubric,
  getSubMetric,
  scoreFromThresholds
};
