# Junction Accelerator Generator - QC Report

**Generated:** 2026-09-27
**Analysis Scope:** Full codebase (excluding clients/)
**Total Code Analyzed:** ~18,000 lines across 23 source files

---

## Executive Summary

| Category | Issues Found | Severity |
|----------|-------------|----------|
| Code Duplication | 27 functions (~500 LOC) | HIGH |
| Unused Dependencies | 1 package (~2.6MB) | MEDIUM |
| Performance Issues | 8 patterns identified | MEDIUM |
| Dead Code | 2 placeholder TODOs, 28+ debug logs | LOW |
| Architecture | Monolithic files need splitting | HIGH |

**Estimated savings:** ~500 lines of duplicate code, ~2.6MB in node_modules

---

## 1. Code Duplication (HIGH Priority)

### 1.1 Duplicated Functions Between generate-assessment-background.js and regenerate-assessment-background.js

These 27 functions are **100% identical** between both files (~450-500 LOC total):

| Function | Lines |
|----------|-------|
| `fetchWithRetry()` | ~60 |
| `fetchWithTimeout()` | ~20 |
| `extractDomain()` | ~10 |
| `stripHtmlTags()` | ~5 |
| `sanitizeAssessmentData()` | ~25 |
| `detectPhone()` | ~15 |
| `detectEmail()` | ~15 |
| `detectAddress()` | ~20 |
| `detectHours()` | ~15 |
| `detectPricing()` | ~15 |
| `detectVideo()` | ~10 |
| `detectDirectionsLink()` | ~10 |
| `detectBookingWidget()` | ~15 |
| `detectMembershipInfo()` | ~15 |
| `detectNewsletter()` | ~10 |
| `detectEvents()` | ~15 |
| `detectGiftShop()` | ~10 |
| `detectAccessibility()` | ~15 |
| `detectVirtualTour()` | ~10 |
| `extractInstagramHandle()` | ~15 |
| `extractTikTokHandle()` | ~15 |
| `extractYouTubeHandle()` | ~15 |
| Google Places utilities | ~80 |
| Social media parsing helpers | ~60 |

**Location:**
- `netlify/functions/generate-assessment-background.js` (lines 1700-2200+)
- `netlify/functions/regenerate-assessment-background.js` (lines 25-500+)

**Recommended Fix:** Extract to `shared/api-helpers.js` and `shared/html-parsers.js`

---

## 2. Unused Dependencies (MEDIUM Priority)

### 2.1 @anthropic-ai/sdk - COMPLETELY UNUSED

**Evidence:** Zero imports found anywhere in codebase. The Anthropic API is called via raw `fetch()`:

```javascript
// Current implementation (generate-assessment-background.js ~line 5000+)
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({ model: 'claude-3-5-sonnet-20241022', ... })
});
```

**Impact:** ~2.6MB in node_modules with zero functionality used

**Fix:** `npm uninstall @anthropic-ai/sdk`

---

## 3. Performance Issues (MEDIUM Priority)

### 3.1 JSON.parse/stringify for Deep Cloning
**Location:** `shared/verification-engine.js:769`
```javascript
const updated = JSON.parse(JSON.stringify(socialMediaData)); // SLOW
```
**Impact:** 5-50ms per clone depending on data size
**Fix:** Use `structuredClone()` or targeted object spread

### 3.2 Redundant Array Iterations
**Location:** `shared/scoring-engine.js:762-763`
```javascript
const lowCount = confidenceLevels.filter(c => c === 'low').length;
const highCount = confidenceLevels.filter(c => c === 'high').length;
```
**Fix:** Single loop counting both values

### 3.3 Promise.all Without Fallback
**Location:** `generate-assessment-background.js:1593`
```javascript
const [mobileRes, desktopRes] = await Promise.all([...]);
```
**Issue:** If one fails, both results are lost
**Fix:** Use `Promise.allSettled()` for graceful partial handling

### 3.4 Linear Grade Threshold Search
**Location:** `shared/rubrics.js:486-489`
**Issue:** Iterates through 13 thresholds on every score
**Fix:** Use lookup table or binary search

### 3.5 Recursive Sanitization Creates Many Objects
**Location:** `generate-assessment-background.js:1700-1725`
**Issue:** Deep recursion with intermediate object creation
**Fix:** Limit recursion depth, consider in-place mutation

---

## 4. Dead Code (LOW Priority)

### 4.1 Placeholder TODOs That Throw Errors
**Location:** `netlify/functions/generate-pdf.js`
- Line ~800: `throw new Error('Accelerator dashboard PDF generation not yet implemented')`
- Line ~900: `throw new Error('Experience dashboard PDF generation not yet implemented')`

**Action:** Either implement or remove these placeholder functions

### 4.2 Debug Console.log Statements (28+)
**Locations:** Throughout `generate-assessment-background.js` and `regenerate-assessment-background.js`

Examples:
- `console.log('[SCORING DEBUG]...')`
- `console.log('[SEOptimer] Polling...')`
- `console.log('[SociaVault] Response...')`

**Action:** Consider conditional logging or removal for production

---

## 5. Architecture Issues (HIGH Priority)

### 5.1 Monolithic Files

| File | Lines | Issue |
|------|-------|-------|
| `generate-assessment-background.js` | 6,931 | Contains 40+ functions mixing API calls, HTML parsing, data processing |
| `regenerate-assessment-background.js` | 3,651 | Duplicates 70% of generate-assessment |
| `generate-pdf.js` | 1,188 | Handles 3 different PDF types |

### 5.2 Recommended Module Extraction

**Create `shared/api-helpers.js`:**
- `fetchWithRetry()`
- `fetchWithTimeout()`
- Social media API handlers
- Google Places utilities
- SEOptimer handler

**Create `shared/html-parsers.js`:**
- All `detect*()` functions (Phone, Email, Address, Hours, etc.)
- `extractDomain()`
- `stripHtmlTags()`

**Create `shared/sanitizers.js`:**
- `sanitizeAssessmentData()`
- `escapeHtml()` (currently duplicated in 3+ files)

---

## 6. What's Working Well

- **No circular dependencies** - Import graph is clean and one-directional
- **Good dependency hygiene** - Only 2 production deps, both used (except Anthropic SDK)
- **Native APIs used** - fetch(), Date, Buffer instead of heavy libraries
- **Consistent naming** - kebab-case files, camelCase functions
- **Clear separation** - Browser modules separate from Node.js modules
- **Versioning** - SCORING_ENGINE_VERSION and VERIFICATION_ENGINE_VERSION tracked

---

## 7. Recommended Fix Order

### Phase 1: Quick Wins (No Risk)
1. Remove unused `@anthropic-ai/sdk` dependency
2. Fix redundant array iterations in scoring-engine.js
3. Replace JSON.parse/stringify with structuredClone()

### Phase 2: Extract Shared Utilities (Low Risk)
4. Create `shared/api-helpers.js` with fetchWithRetry, fetchWithTimeout
5. Create `shared/html-parsers.js` with detect* functions
6. Update imports in both assessment functions

### Phase 3: Architecture Cleanup (Medium Risk)
7. Consolidate duplicate code between generate/regenerate functions
8. Consider splitting generate-pdf.js by PDF type

---

## Implementation Plan

I will now implement the safe fixes in the following order:

1. **Remove @anthropic-ai/sdk** - zero risk, just removes unused package
2. **Create shared/api-helpers.js** - extract duplicated fetch utilities
3. **Create shared/html-parsers.js** - extract duplicated detection functions
4. **Update generate-assessment-background.js** - import from shared modules
5. **Update regenerate-assessment-background.js** - import from shared modules
6. **Fix performance issues** - JSON clone, redundant filters
7. **Clean up debug logging** - make conditional

Each fix will be committed separately for easy rollback if needed.
