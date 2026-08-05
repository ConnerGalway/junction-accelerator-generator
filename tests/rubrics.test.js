/**
 * Tests for rubrics.js - Validates all scoring rubric definitions
 */

const {
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
} = require('../shared/rubrics');

describe('Rubrics Module', () => {

  describe('SCORING_ENGINE_VERSION', () => {
    test('should be a valid semver string', () => {
      expect(SCORING_ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('CATEGORY_WEIGHTS', () => {
    test('should have exactly 6 categories', () => {
      expect(Object.keys(CATEGORY_WEIGHTS)).toHaveLength(6);
    });

    test('should sum to exactly 1.0', () => {
      const sum = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    test('should have all required categories', () => {
      const expectedCategories = [
        'website_technical',
        'reviews_reputation',
        'booking_conversion',
        'social_media',
        'guest_experience',
        'local_visibility'
      ];

      expectedCategories.forEach(category => {
        expect(CATEGORY_WEIGHTS).toHaveProperty(category);
      });
    });

    test('all weights should be positive numbers', () => {
      Object.values(CATEGORY_WEIGHTS).forEach(weight => {
        expect(typeof weight).toBe('number');
        expect(weight).toBeGreaterThan(0);
        expect(weight).toBeLessThanOrEqual(1);
      });
    });

    test('reviews_reputation should have highest weight', () => {
      const maxWeight = Math.max(...Object.values(CATEGORY_WEIGHTS));
      expect(CATEGORY_WEIGHTS.reviews_reputation).toBe(maxWeight);
    });
  });

  describe('GRADE_THRESHOLDS', () => {
    test('should have 13 grade levels', () => {
      expect(GRADE_THRESHOLDS).toHaveLength(13);
    });

    test('should cover full 0-100 range without gaps', () => {
      // Sort by min value
      const sorted = [...GRADE_THRESHOLDS].sort((a, b) => a.min - b.min);

      // First threshold should start at 0
      expect(sorted[0].min).toBe(0);

      // Last threshold should cover up to 100
      expect(sorted[sorted.length - 1].max).toBe(100);

      // Check for gaps
      for (let i = 1; i < sorted.length; i++) {
        const prevMax = sorted[i - 1].max;
        const currMin = sorted[i].min;
        // Allow for small floating point differences
        expect(currMin - prevMax).toBeLessThan(0.1);
      }
    });

    test('should have valid grade strings', () => {
      const validGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

      GRADE_THRESHOLDS.forEach(threshold => {
        expect(validGrades).toContain(threshold.grade);
      });
    });

    test('should have no overlapping ranges', () => {
      for (let i = 0; i < GRADE_THRESHOLDS.length; i++) {
        for (let j = i + 1; j < GRADE_THRESHOLDS.length; j++) {
          const a = GRADE_THRESHOLDS[i];
          const b = GRADE_THRESHOLDS[j];

          // Ranges overlap if: a.min <= b.max AND b.min <= a.max
          const overlap = a.min <= b.max && b.min <= a.max;

          // Allow touching ranges (where max of one equals min of another)
          if (overlap) {
            expect(a.max === b.min || b.max === a.min).toBe(true);
          }
        }
      }
    });
  });

  describe('MISSING_DATA_POLICY', () => {
    test('should have required policies', () => {
      expect(MISSING_DATA_POLICY).toHaveProperty('unavailable');
      expect(MISSING_DATA_POLICY).toHaveProperty('error');
      expect(MISSING_DATA_POLICY).toHaveProperty('empty');
    });

    test('all policies should have score, confidence, and note', () => {
      Object.values(MISSING_DATA_POLICY).forEach(policy => {
        expect(policy).toHaveProperty('score');
        expect(policy).toHaveProperty('confidence');
        expect(policy).toHaveProperty('note');
        expect(typeof policy.score).toBe('number');
        expect(policy.score).toBeGreaterThanOrEqual(0);
        expect(policy.score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('RUBRICS', () => {
    test('should have a rubric for each category', () => {
      Object.keys(CATEGORY_WEIGHTS).forEach(category => {
        expect(RUBRICS).toHaveProperty(category);
      });
    });

    test('each rubric should have required properties', () => {
      Object.entries(RUBRICS).forEach(([key, rubric]) => {
        expect(rubric).toHaveProperty('title');
        expect(rubric).toHaveProperty('weight');
        expect(rubric).toHaveProperty('dataSources');
        expect(rubric).toHaveProperty('subMetrics');
        expect(typeof rubric.title).toBe('string');
        expect(Array.isArray(rubric.dataSources)).toBe(true);
      });
    });

    test('rubric weights should match CATEGORY_WEIGHTS', () => {
      Object.entries(RUBRICS).forEach(([key, rubric]) => {
        expect(rubric.weight).toBe(CATEGORY_WEIGHTS[key]);
      });
    });

    test('sub-metric weights should sum to 1.0 for each category', () => {
      Object.entries(RUBRICS).forEach(([categoryKey, rubric]) => {
        const subMetricSum = Object.values(rubric.subMetrics)
          .reduce((sum, metric) => sum + metric.weight, 0);

        expect(subMetricSum).toBeCloseTo(1.0, 10);
      });
    });

    test('each sub-metric should have required properties', () => {
      Object.entries(RUBRICS).forEach(([categoryKey, rubric]) => {
        Object.entries(rubric.subMetrics).forEach(([metricKey, metric]) => {
          expect(metric).toHaveProperty('weight');
          expect(metric).toHaveProperty('source');
          expect(metric).toHaveProperty('type');
          expect(metric).toHaveProperty('benchmark');

          expect(typeof metric.weight).toBe('number');
          expect(metric.weight).toBeGreaterThan(0);
          expect(metric.weight).toBeLessThanOrEqual(1);
        });
      });
    });

    test('threshold-type metrics should have valid thresholds array', () => {
      Object.values(RUBRICS).forEach(rubric => {
        Object.values(rubric.subMetrics).forEach(metric => {
          if (metric.type === 'threshold') {
            expect(Array.isArray(metric.thresholds)).toBe(true);
            expect(metric.thresholds.length).toBeGreaterThan(0);

            metric.thresholds.forEach(threshold => {
              expect(threshold).toHaveProperty('score');
              expect(typeof threshold.score).toBe('number');
              expect(threshold.score).toBeGreaterThanOrEqual(0);
              expect(threshold.score).toBeLessThanOrEqual(100);
            });
          }
        });
      });
    });

    test('boolean-type metrics should have trueScore and falseScore', () => {
      Object.values(RUBRICS).forEach(rubric => {
        Object.values(rubric.subMetrics).forEach(metric => {
          if (metric.type === 'boolean') {
            expect(metric).toHaveProperty('trueScore');
            expect(metric).toHaveProperty('falseScore');
            expect(typeof metric.trueScore).toBe('number');
            expect(typeof metric.falseScore).toBe('number');
          }
        });
      });
    });
  });

  describe('scoreToGrade()', () => {
    test('should return correct grade for boundary values', () => {
      expect(scoreToGrade(100)).toBe('A+');
      expect(scoreToGrade(95)).toBe('A+');
      expect(scoreToGrade(94)).toBe('A');
      expect(scoreToGrade(90)).toBe('A');
      expect(scoreToGrade(87)).toBe('A-');
      expect(scoreToGrade(83)).toBe('B+');
      expect(scoreToGrade(80)).toBe('B');
      expect(scoreToGrade(77)).toBe('B-');
      expect(scoreToGrade(73)).toBe('C+');
      expect(scoreToGrade(70)).toBe('C');
      expect(scoreToGrade(67)).toBe('C-');
      expect(scoreToGrade(63)).toBe('D+');
      expect(scoreToGrade(60)).toBe('D');
      expect(scoreToGrade(57)).toBe('D-');
      expect(scoreToGrade(56)).toBe('F');
      expect(scoreToGrade(0)).toBe('F');
    });

    test('should handle edge cases', () => {
      expect(scoreToGrade(100.5)).toBe('A+'); // Above 100 clamped
      expect(scoreToGrade(-5)).toBe('F'); // Below 0 clamped
      expect(scoreToGrade(null)).toBe('N/A');
      expect(scoreToGrade(undefined)).toBe('N/A');
      expect(scoreToGrade(NaN)).toBe('N/A');
      expect(scoreToGrade('85')).toBe('N/A'); // String
    });

    test('should handle decimal values correctly', () => {
      expect(scoreToGrade(94.9)).toBe('A');
      expect(scoreToGrade(89.9)).toBe('A-');
      expect(scoreToGrade(56.9)).toBe('F');
    });
  });

  describe('getCategoryKeys()', () => {
    test('should return array of category keys', () => {
      const keys = getCategoryKeys();
      expect(Array.isArray(keys)).toBe(true);
      expect(keys).toHaveLength(6);
    });

    test('should match CATEGORY_WEIGHTS keys', () => {
      const keys = getCategoryKeys();
      expect(keys.sort()).toEqual(Object.keys(CATEGORY_WEIGHTS).sort());
    });
  });

  describe('validateWeights()', () => {
    test('should return valid for correct weights', () => {
      const result = validateWeights();
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('getRubric()', () => {
    test('should return rubric for valid category', () => {
      const rubric = getRubric('reviews_reputation');
      expect(rubric).not.toBeNull();
      expect(rubric.title).toBe('Reviews & Reputation');
    });

    test('should return null for invalid category', () => {
      expect(getRubric('invalid_category')).toBeNull();
      expect(getRubric('')).toBeNull();
      expect(getRubric(null)).toBeNull();
    });
  });

  describe('getSubMetric()', () => {
    test('should return sub-metric for valid path', () => {
      const metric = getSubMetric('reviews_reputation', 'google_rating');
      expect(metric).not.toBeNull();
      expect(metric.weight).toBe(0.40);
    });

    test('should return null for invalid paths', () => {
      expect(getSubMetric('invalid', 'google_rating')).toBeNull();
      expect(getSubMetric('reviews_reputation', 'invalid')).toBeNull();
      expect(getSubMetric(null, null)).toBeNull();
    });
  });

  describe('scoreFromThresholds()', () => {
    const ascendingThresholds = [
      { min: 500, score: 100 },
      { min: 300, score: 90 },
      { min: 100, score: 70 },
      { min: 0, score: 40 }
    ];

    const descendingThresholds = [
      { max: 2, score: 100 },
      { max: 4, score: 75 },
      { max: 6, score: 50 },
      { max: Infinity, score: 25 }
    ];

    test('should score correctly for ascending thresholds', () => {
      expect(scoreFromThresholds(600, ascendingThresholds, 'ascending')).toBe(100);
      expect(scoreFromThresholds(500, ascendingThresholds, 'ascending')).toBe(100);
      expect(scoreFromThresholds(400, ascendingThresholds, 'ascending')).toBe(90);
      expect(scoreFromThresholds(200, ascendingThresholds, 'ascending')).toBe(70);
      expect(scoreFromThresholds(50, ascendingThresholds, 'ascending')).toBe(40);
      expect(scoreFromThresholds(0, ascendingThresholds, 'ascending')).toBe(40);
    });

    test('should score correctly for descending thresholds', () => {
      expect(scoreFromThresholds(1, descendingThresholds, 'descending')).toBe(100);
      expect(scoreFromThresholds(2, descendingThresholds, 'descending')).toBe(100);
      expect(scoreFromThresholds(3, descendingThresholds, 'descending')).toBe(75);
      expect(scoreFromThresholds(5, descendingThresholds, 'descending')).toBe(50);
      expect(scoreFromThresholds(10, descendingThresholds, 'descending')).toBe(25);
    });

    test('should handle edge cases', () => {
      expect(scoreFromThresholds(null, ascendingThresholds)).toBe(40); // Missing data score
      expect(scoreFromThresholds(undefined, ascendingThresholds)).toBe(40);
      expect(scoreFromThresholds(NaN, ascendingThresholds)).toBe(40);
    });
  });

});
