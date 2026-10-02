/**
 * Analytics Tracking Module
 *
 * Tracks user activity on client dashboards:
 * - Page views (navigation between tabs)
 * - Session start/end with duration
 * - Checkbox changes (with timestamps)
 * - Tour engagement (start, complete, skip)
 *
 * Events are batched and sent to Supabase. Session end uses sendBeacon
 * for reliability on page unload.
 */

(async function () {

  // ──────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ──────────────────────────────────────────────────────────────────────────

  function isStorageAvailable() {
    try {
      const test = '__storage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  const storageAvailable = isStorageAvailable();
  const clientSlug = document.body.getAttribute('data-client-slug');

  // Exit early if no client slug (e.g., admin pages)
  if (!clientSlug) return;

  // ──────────────────────────────────────────────────────────────────────────
  // WAIT FOR AUTH
  // ──────────────────────────────────────────────────────────────────────────

  if (!window.__authReady) {
    console.warn('Analytics: auth not ready');
    return;
  }

  let userEmail, userRole;
  try {
    const authData = await window.__authReady;
    userEmail = authData.email;
    userRole = authData.role;
  } catch (e) {
    console.warn('Analytics: auth failed', e);
    return;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET USER SESSION
  // ──────────────────────────────────────────────────────────────────────────

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    console.warn('Analytics: no session');
    return;
  }

  const userId = session.user.id;

  // ──────────────────────────────────────────────────────────────────────────
  // EVENT QUEUE WITH BATCHING
  // ──────────────────────────────────────────────────────────────────────────

  const QUEUE_KEY = `analytics_queue_${clientSlug}`;
  const FLUSH_INTERVAL = 2000; // 2 seconds
  const eventQueue = [];
  let flushTimer = null;

  /**
   * Track an analytics event
   * @param {string} eventType - One of: page_view, session_start, session_end, checkbox_change, tour_start, tour_complete, tour_skip
   * @param {object} eventData - Event-specific data
   */
  function trackEvent(eventType, eventData = {}) {
    const event = {
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      client_slug: clientSlug,
      event_type: eventType,
      event_data: eventData,
      created_at: new Date().toISOString()
    };

    eventQueue.push(event);

    // Debounce the flush
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flushEvents, FLUSH_INTERVAL);
  }

  /**
   * Flush queued events to Supabase
   */
  async function flushEvents() {
    if (eventQueue.length === 0) return;

    // Take all events from queue
    const batch = eventQueue.splice(0, eventQueue.length);

    try {
      const { error } = await supabaseClient
        .from('analytics_events')
        .insert(batch);

      if (error) {
        console.warn('Analytics: failed to save events', error);
        // Re-queue the failed events
        eventQueue.unshift(...batch);
        // Save to storage for recovery
        saveQueueToStorage();
      }
    } catch (e) {
      console.warn('Analytics: network error', e);
      eventQueue.unshift(...batch);
      saveQueueToStorage();
    }
  }

  /**
   * Save pending events to sessionStorage for recovery
   */
  function saveQueueToStorage() {
    if (!storageAvailable || eventQueue.length === 0) return;
    try {
      sessionStorage.setItem(QUEUE_KEY, JSON.stringify(eventQueue));
    } catch (e) {
      console.warn('Analytics: failed to save queue to storage', e);
    }
  }

  /**
   * Load and flush any pending events from previous session
   */
  async function flushPendingQueueFromStorage() {
    if (!storageAvailable) return;

    try {
      const stored = sessionStorage.getItem(QUEUE_KEY);
      if (!stored) return;

      const pending = JSON.parse(stored);
      if (!Array.isArray(pending) || pending.length === 0) return;

      sessionStorage.removeItem(QUEUE_KEY);

      const { error } = await supabaseClient
        .from('analytics_events')
        .insert(pending);

      if (error) {
        console.warn('Analytics: failed to flush stored events', error);
        // Re-save for next attempt
        sessionStorage.setItem(QUEUE_KEY, JSON.stringify(pending));
      }
    } catch (e) {
      console.warn('Analytics: failed to load stored queue', e);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SESSION TRACKING
  // ──────────────────────────────────────────────────────────────────────────

  const sessionStart = Date.now();

  // Flush any pending events from previous session
  await flushPendingQueueFromStorage();

  // Track session start
  trackEvent('session_start', {
    referrer: document.referrer || null,
    url: window.location.href
  });

  // Track session end on page unload using sendBeacon
  window.addEventListener('beforeunload', () => {
    const durationSeconds = Math.round((Date.now() - sessionStart) / 1000);

    // Flush any remaining queued events first
    if (eventQueue.length > 0) {
      const batch = eventQueue.splice(0, eventQueue.length);
      const payload = JSON.stringify(batch);
      navigator.sendBeacon('/.netlify/functions/analytics-event', payload);
    }

    // Send session end event
    const sessionEndEvent = [{
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      client_slug: clientSlug,
      event_type: 'session_end',
      event_data: { duration_seconds: durationSeconds },
      created_at: new Date().toISOString()
    }];

    navigator.sendBeacon(
      '/.netlify/functions/analytics-event',
      JSON.stringify(sessionEndEvent)
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PAGE VIEW TRACKING
  // ──────────────────────────────────────────────────────────────────────────

  // Wrap the existing navigate function if it exists
  if (typeof window.navigate === 'function') {
    const originalNavigate = window.navigate;
    window.navigate = function (pageId) {
      trackEvent('page_view', { page: pageId });
      return originalNavigate(pageId);
    };
  }

  // Track initial page view
  const initialPage = document.querySelector('.page.active');
  if (initialPage) {
    const pageId = initialPage.id.replace('page-', '');
    trackEvent('page_view', { page: pageId });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CHECKBOX CHANGE TRACKING
  // ──────────────────────────────────────────────────────────────────────────

  document.querySelectorAll('input[type="checkbox"][data-key]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const section = checkbox.closest('[data-week]');
      const week = section ? parseInt(section.getAttribute('data-week'), 10) : null;

      trackEvent('checkbox_change', {
        item_key: checkbox.getAttribute('data-key'),
        checked: checkbox.checked,
        week: week
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TOUR TRACKING (exposed as global functions for tour.js to call)
  // ──────────────────────────────────────────────────────────────────────────

  window.__trackTourStart = function () {
    trackEvent('tour_start', {});
  };

  window.__trackTourComplete = function (stepsViewed) {
    trackEvent('tour_complete', { steps_viewed: stepsViewed });
  };

  window.__trackTourSkip = function (stepSkippedAt) {
    trackEvent('tour_skip', { step_skipped_at: stepSkippedAt });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC API (for debugging and manual tracking)
  // ──────────────────────────────────────────────────────────────────────────

  window.__analytics = {
    trackEvent,
    flushEvents,
    getQueueLength: () => eventQueue.length
  };

})();
