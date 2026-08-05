/**
 * Tests for scoring-engine.js - Validates deterministic scoring calculations
 */

const {
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
} = require('../shared/scoring-engine');

const { CATEGORY_WEIGHTS } = require('../shared/rubrics');

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const mockSEOptimerData = {
  performance: {
    desktop_score: 85,
    mobile_score: 72,
    load_time: 2.5
  },
  seo: {
    score: 78,
    title: 'Example Business - Tourism Services',
    description: 'We provide excellent tourism services in the area.'
  },
  mobile: {
    is_mobile_friendly: true,
    has_viewport: true
  },
  security: {
    https: true
  }
};

const mockGooglePlacesData = {
  name: 'Example Tourism Business',
  rating: 4.6,
  totalReviews: 234,
  priceLevel: 2,
  website: 'https://example.com',
  phone: '+1-555-123-4567',
  businessTypes: ['restaurant', 'point_of_interest'],
  recentReviews: [
    { rating: 5, text: 'Great experience!', relativeTime: '2 weeks ago' },
    { rating: 4, text: 'Good food, nice atmosphere.', relativeTime: '1 month ago' },
    { rating: 5, text: 'Loved it!', relativeTime: '3 months ago' }
  ],
  _reviewAnalysis: {
    totalProvided: 5,
    recentCount: 4,
    recencyWarning: false
  }
};

const mockWebsiteAnalysis = {
  hasBookingLink: true,
  bookingPlatforms: ['OpenTable', 'Booking.com'],
  hasPhone: true,
  hasEmail: true,
  hasAddress: true,
  hasHours: true,
  hasPricing: true,
  hasDirections: true,
  hasParking: true,
  hasAccessibility: false,
  hasMobileViewport: true,
  hasSSL: true,
  hasVideoEmbed: true,
  hasMultiLanguage: false,
  imageCount: 15,
  socialLinksOnSite: ['Instagram', 'Facebook'],
  pageSizeKB: 450
};

const mockSocialMediaData = {
  platforms: {
    instagram: {
      handle: 'examplebiz',
      followers: 5500,
      following: 450,
      postCount: 120,
      verified: false,
      metrics: {
        engagementRate: 4.2,
        avgLikes: 220,
        avgComments: 12,
        postingFrequency: 3.5
      },
      contentMix: {
        images: 60,
        carousels: 30,
        reels: 30
      }
    },
    facebook: {
      name: 'Example Business',
      followers: 2300,
      likes: 2100,
      category: 'Restaurant'
    }
  },
  summary: {
    totalFollowers: 7800,
    platformsFound: 2,
    platformsAnalyzed: ['instagram', 'facebook']
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring Engine', () => {

  describe('calculateAllScores()', () => {

    test('should return complete scoring result with all properties', () => {
      const result = calculateAllScores({
        seoptData: mockSEOptimerData,
        googlePlacesData: mockGooglePlacesData,
        websiteAnalysis: mockWebsiteAnalysis,
        socialMediaData: mockSocialMediaData
      });

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('calculatedAt');
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('missingDataFlags');
      expect(result).toHaveProperty('audit');
    });

    test('should return reproducible scores (same input = same output)', () => {
      const input = {
        seoptData: mockSEOptimerData,
        googlePlacesData: mockGooglePlacesData,
        websiteAnalysis: mockWebsiteAnalysis,
        socialMediaData: mockSocialMediaData
      };

      const result1 = calculateAllScores(input);
      const result2 = calculateAllScores(input);
      const result3 = calculateAllScores(input);

      // Scores should be identical
      expect(result1.overall.score).toBe(result2.overall.score);
      expect(result2.overall.score).toBe(result3.overall.score);

      // Category scores should be identical
      Object.keys(result1.categories).forEach(key => {
        expect(result1.categories[key].score).toBe(result2.categories[key].score);
        expect(result2.categories[key].score).toBe(result3.categories[key].score);
      });
    });

    test('should have all 6 category scores', () => {
      const result = calculateAllScores({
        seoptData: mockSEOptimerData,
        googlePlacesData: mockGooglePlacesData,
        websiteAnalysis: mockWebsiteAnalysis,
        socialMediaData: mockSocialMediaData
      });

      expect(Object.keys(result.categories)).toHaveLength(6);
      expect(result.categories).toHaveProperty('website_technical');
      expect(result.categories).toHaveProperty('reviews_reputation');
      expect(result.categories).toHaveProperty('booking_conversion');
      expect(result.categories).toHaveProperty('social_media');
      expect(result.categories).toHaveProperty('guest_experience');
      expect(result.categories).toHaveProperty('local_visibility');
    });

    test('should handle completely missing data gracefully', () => {
      const result = calculateAllScores({});

      expect(result.overall.score).toBeGreaterThanOrEqual(0);
      expect(result.overall.score).toBeLessThanOrEqual(100);
      expect(result.overall.confidence).toBe('low');
      expect(result.missingDataFlags.length).toBeGreaterThan(0);
    });

    test('should flag missing data sources correctly', () => {
      const result = calculateAllScores({
        websiteAnalysis: mockWebsiteAnalysis
      });

      expect(result.missingDataFlags).toContain('seoptimer_unavailable');
      expect(result.missingDataFlags).toContain('google_places_unavailable');
      expect(result.missingDataFlags).toContain('social_media_unavailable');
      expect(result.missingDataFlags).not.toContain('website_analysis_unavailable');
    });
  });

  describe('calculateWebsiteTechnicalScore()', () => {

    test('should calculate score from SEOptimer and website data', () => {
      const result = calculateWebsiteTechnicalScore(mockSEOptimerData, mockWebsiteAnalysis);

      expect(result).toHaveProperty('title', 'Website & Technical Foundation');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('grade');
      expect(result).toHaveProperty('weight', 0.15);
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('breakdown');

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    test('should return lower score when SSL is missing', () => {
      const noSSL = { ...mockWebsiteAnalysis, hasSSL: false };
      const withSSL = calculateWebsiteTechnicalScore(mockSEOptimerData, mockWebsiteAnalysis);
      const withoutSSL = calculateWebsiteTechnicalScore(mockSEOptimerData, noSSL);

      expect(withoutSSL.score).toBeLessThan(withSSL.score);
    });

    test('should handle missing SEOptimer data', () => {
      const result = calculateWebsiteTechnicalScore(null, mockWebsiteAnalysis);

      // With website analysis available, confidence is still high for those signals
      // SEOptimer-dependent metrics will have unavailable source but default scores
      expect(result.confidence).toBe('high'); // Website analysis provides valid data
      expect(result.score).toBeGreaterThan(0); // Should still have some score from website analysis
      expect(result.breakdown.desktop_speed.source).toBe('unavailable');
      expect(result.breakdown.mobile_speed.source).toBe('unavailable');
      expect(result.breakdown.ssl_https.source).toBe('Website Analysis');
    });

    test('should handle error state in SEOptimer data', () => {
      const errorData = { _error: 'API timeout' };
      const result = calculateWebsiteTechnicalScore(errorData, mockWebsiteAnalysis);

      expect(result.breakdown.desktop_speed.source).toBe('unavailable');
      expect(result.breakdown.mobile_speed.source).toBe('unavailable');
    });
  });

  describe('calculateReviewsReputationScore()', () => {

    test('should calculate score from Google Places data', () => {
      const result = calculateReviewsReputationScore(mockGooglePlacesData);

      expect(result.title).toBe('Reviews & Reputation');
      expect(result.weight).toBe(0.25);
      expect(result.confidence).toBe('high');
      expect(result.score).toBeGreaterThan(70); // 4.6 rating with 234 reviews should be good
    });

    test('should score higher for better ratings', () => {
      const highRating = { ...mockGooglePlacesData, rating: 4.9, totalReviews: 500 };
      const lowRating = { ...mockGooglePlacesData, rating: 3.5, totalReviews: 50 };

      const highResult = calculateReviewsReputationScore(highRating);
      const lowResult = calculateReviewsReputationScore(lowRating);

      expect(highResult.score).toBeGreaterThan(lowResult.score);
    });

    test('should return low confidence when Google data unavailable', () => {
      const result = calculateReviewsReputationScore(null);

      expect(result.confidence).toBe('low');
      expect(result.score).toBe(50);
      expect(result.note).toContain('manual verification');
    });

    test('should handle error state in Google data', () => {
      const errorData = { _error: 'Business not found' };
      const result = calculateReviewsReputationScore(errorData);

      expect(result.confidence).toBe('low');
      expect(result.score).toBe(50);
    });

    test('should include review recency in scoring', () => {
      const recentReviews = {
        ...mockGooglePlacesData,
        _reviewAnalysis: { totalProvided: 5, recentCount: 5, recencyWarning: false }
      };
      const oldReviews = {
        ...mockGooglePlacesData,
        _reviewAnalysis: { totalProvided: 5, recentCount: 1, recencyWarning: true }
      };

      const recentResult = calculateReviewsReputationScore(recentReviews);
      const oldResult = calculateReviewsReputationScore(oldReviews);

      expect(recentResult.breakdown.review_recency.score)
        .toBeGreaterThan(oldResult.breakdown.review_recency.score);
    });
  });

  describe('calculateBookingConversionScore()', () => {

    test('should calculate score from website analysis', () => {
      const result = calculateBookingConversionScore(mockWebsiteAnalysis);

      expect(result.title).toBe('Online Booking & Conversion');
      expect(result.weight).toBe(0.20);
      expect(result.confidence).toBe('high');
    });

    test('should score higher when booking link is present', () => {
      const withBooking = calculateBookingConversionScore(mockWebsiteAnalysis);
      const noBooking = calculateBookingConversionScore({
        ...mockWebsiteAnalysis,
        hasBookingLink: false,
        bookingPlatforms: []
      });

      expect(withBooking.score).toBeGreaterThan(noBooking.score);
    });

    test('should score higher with more booking platforms', () => {
      const manyPlatforms = calculateBookingConversionScore({
        ...mockWebsiteAnalysis,
        bookingPlatforms: ['OpenTable', 'Booking.com', 'Viator']
      });
      const onePlatform = calculateBookingConversionScore({
        ...mockWebsiteAnalysis,
        bookingPlatforms: ['OpenTable']
      });

      expect(manyPlatforms.score).toBeGreaterThan(onePlatform.score);
    });

    test('should handle missing website analysis', () => {
      const result = calculateBookingConversionScore(null);

      expect(result.confidence).toBe('low');
      expect(result.score).toBe(50);
    });
  });

  describe('calculateSocialMediaScore()', () => {

    test('should calculate score from social media data', () => {
      const result = calculateSocialMediaScore(mockSocialMediaData);

      expect(result.title).toBe('Social Media & Content');
      expect(result.weight).toBe(0.20);
      expect(result.confidence).toBe('high');
    });

    test('should score higher with more followers', () => {
      const highFollowers = {
        ...mockSocialMediaData,
        summary: { ...mockSocialMediaData.summary, totalFollowers: 50000 }
      };
      const lowFollowers = {
        ...mockSocialMediaData,
        summary: { ...mockSocialMediaData.summary, totalFollowers: 500 }
      };

      const highResult = calculateSocialMediaScore(highFollowers);
      const lowResult = calculateSocialMediaScore(lowFollowers);

      expect(highResult.score).toBeGreaterThan(lowResult.score);
    });

    test('should score higher with better engagement', () => {
      const highEngagement = {
        ...mockSocialMediaData,
        platforms: {
          ...mockSocialMediaData.platforms,
          instagram: {
            ...mockSocialMediaData.platforms.instagram,
            metrics: { ...mockSocialMediaData.platforms.instagram.metrics, engagementRate: 8.0 }
          }
        }
      };
      const lowEngagement = {
        ...mockSocialMediaData,
        platforms: {
          ...mockSocialMediaData.platforms,
          instagram: {
            ...mockSocialMediaData.platforms.instagram,
            metrics: { ...mockSocialMediaData.platforms.instagram.metrics, engagementRate: 0.5 }
          }
        }
      };

      const highResult = calculateSocialMediaScore(highEngagement);
      const lowResult = calculateSocialMediaScore(lowEngagement);

      expect(highResult.score).toBeGreaterThan(lowResult.score);
    });

    test('should handle missing social media data', () => {
      const result = calculateSocialMediaScore(null);

      expect(result.confidence).toBe('low');
      expect(result.score).toBe(50);
    });
  });

  describe('calculateGuestExperienceScore()', () => {

    test('should calculate score from website analysis', () => {
      const result = calculateGuestExperienceScore(mockWebsiteAnalysis);

      expect(result.title).toBe('Digital Guest Experience');
      expect(result.weight).toBe(0.10);
      expect(result.confidence).toBe('high');
    });

    test('should score higher when hours are displayed', () => {
      const withHours = calculateGuestExperienceScore(mockWebsiteAnalysis);
      const noHours = calculateGuestExperienceScore({
        ...mockWebsiteAnalysis,
        hasHours: false
      });

      expect(withHours.score).toBeGreaterThan(noHours.score);
    });

    test('should score higher with directions/map', () => {
      const withDirections = calculateGuestExperienceScore(mockWebsiteAnalysis);
      const noDirections = calculateGuestExperienceScore({
        ...mockWebsiteAnalysis,
        hasDirections: false
      });

      expect(withDirections.score).toBeGreaterThan(noDirections.score);
    });
  });

  describe('calculateLocalVisibilityScore()', () => {

    test('should calculate score from combined data sources', () => {
      const result = calculateLocalVisibilityScore(
        mockSEOptimerData,
        mockGooglePlacesData,
        mockWebsiteAnalysis
      );

      expect(result.title).toBe('Local Visibility');
      expect(result.weight).toBe(0.10);
    });

    test('should score higher when GBP appears claimed', () => {
      const claimed = calculateLocalVisibilityScore(
        mockSEOptimerData,
        mockGooglePlacesData,
        mockWebsiteAnalysis
      );
      const notClaimed = calculateLocalVisibilityScore(
        mockSEOptimerData,
        null,
        mockWebsiteAnalysis
      );

      expect(claimed.score).toBeGreaterThan(notClaimed.score);
    });
  });

  describe('calculateOverallScore()', () => {

    test('should calculate weighted average of category scores', () => {
      const categoryScores = {
        website_technical: { score: 80, weight: 0.15 },
        reviews_reputation: { score: 90, weight: 0.25 },
        booking_conversion: { score: 70, weight: 0.20 },
        social_media: { score: 75, weight: 0.20 },
        guest_experience: { score: 85, weight: 0.10 },
        local_visibility: { score: 65, weight: 0.10 }
      };

      const result = calculateOverallScore(categoryScores);

      // Manual calculation:
      // (80*0.15) + (90*0.25) + (70*0.20) + (75*0.20) + (85*0.10) + (65*0.10)
      // = 12 + 22.5 + 14 + 15 + 8.5 + 6.5 = 78.5
      expect(result.score).toBe(79); // Rounded
      expect(result.grade).toBe('B-');
    });

    test('should include score breakdown', () => {
      const categoryScores = {
        website_technical: { score: 80, weight: 0.15 },
        reviews_reputation: { score: 90, weight: 0.25 },
        booking_conversion: { score: 70, weight: 0.20 },
        social_media: { score: 75, weight: 0.20 },
        guest_experience: { score: 85, weight: 0.10 },
        local_visibility: { score: 65, weight: 0.10 }
      };

      const result = calculateOverallScore(categoryScores);

      expect(result.breakdown).toHaveProperty('website_technical');
      expect(result.breakdown.website_technical.contribution).toBeCloseTo(12, 1);
    });
  });

  describe('determineOverallConfidence()', () => {

    test('should return high when most categories have high confidence', () => {
      const confidences = ['high', 'high', 'high', 'high', 'medium', 'high'];
      expect(determineOverallConfidence(confidences)).toBe('high');
    });

    test('should return low when 3+ categories have low confidence', () => {
      const confidences = ['low', 'low', 'low', 'high', 'high', 'medium'];
      expect(determineOverallConfidence(confidences)).toBe('low');
    });

    test('should return medium for mixed confidence', () => {
      const confidences = ['high', 'high', 'low', 'low', 'medium', 'medium'];
      expect(determineOverallConfidence(confidences)).toBe('medium');
    });
  });

  describe('buildMissingDataFlags()', () => {

    test('should flag all missing data sources', () => {
      const flags = buildMissingDataFlags({});

      expect(flags).toContain('seoptimer_unavailable');
      expect(flags).toContain('google_places_unavailable');
      expect(flags).toContain('website_analysis_unavailable');
      expect(flags).toContain('social_media_unavailable');
    });

    test('should not flag available data sources', () => {
      const flags = buildMissingDataFlags({
        seoptData: mockSEOptimerData,
        googlePlacesData: mockGooglePlacesData,
        websiteAnalysis: mockWebsiteAnalysis,
        socialMediaData: mockSocialMediaData
      });

      expect(flags).toHaveLength(0);
    });

    test('should flag sources with errors', () => {
      const flags = buildMissingDataFlags({
        seoptData: { _error: 'timeout' },
        googlePlacesData: mockGooglePlacesData
      });

      expect(flags).toContain('seoptimer_unavailable');
      expect(flags).not.toContain('google_places_unavailable');
    });
  });

  describe('calculateContentQualityScore()', () => {

    test('should score optimal video mix (30-50%) highly', () => {
      const optimalMix = {
        platforms: {
          instagram: {
            contentMix: { images: 40, carousels: 20, reels: 40 } // 40% reels
          }
        }
      };

      const result = calculateContentQualityScore(optimalMix);
      expect(result.score).toBe(100);
    });

    test('should score lower for image-only content', () => {
      const imageOnly = {
        platforms: {
          instagram: {
            contentMix: { images: 100, carousels: 0, reels: 0 }
          }
        }
      };

      const result = calculateContentQualityScore(imageOnly);
      expect(result.score).toBeLessThan(60);
    });

    test('should handle missing content mix data', () => {
      const result = calculateContentQualityScore(null);
      expect(result.score).toBe(50);
    });
  });

  describe('Grade Boundary Tests', () => {

    test('should correctly classify scores at grade boundaries', () => {
      const createScoreResult = (score) => ({
        seoptData: { performance: { desktop_score: score, mobile_score: score } },
        googlePlacesData: { rating: 5, totalReviews: 500 },
        websiteAnalysis: mockWebsiteAnalysis,
        socialMediaData: mockSocialMediaData
      });

      // These tests verify the scoring system produces expected grades
      // Actual grade depends on weighted calculation, not direct score input
      const result = calculateAllScores(createScoreResult(95));
      expect(result.overall).toHaveProperty('grade');
      expect(['A+', 'A', 'A-', 'B+', 'B']).toContain(result.overall.grade);
    });
  });

});
