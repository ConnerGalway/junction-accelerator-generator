// milestone.js - Client-side milestone data fetching and UI updates
// Loads after auth.js, fetches milestone assessments from Supabase,
// updates navigation states, and dynamically renders milestone content.
//
// Dependencies:
//   - window.supabaseClient (from supabase-client.js)
//   - window.__authReady (from auth.js)
//   - navigateMilestone() function in page (for navigation)
//   - showMilestoneLocked() function in page (for locked toast)

(async function initMilestones() {
  'use strict';

  // Wait for auth to complete
  const authResult = await window.__authReady;
  if (!authResult || authResult.role === 'guest') {
    // Guest users on demo pages don't need milestone fetching
    // The static HTML content is sufficient
    console.log('[milestone.js] Skipping for guest/demo user');
    return;
  }

  const clientSlug = document.body.getAttribute('data-client-slug');
  const cohortStart = document.body.getAttribute('data-cohort-start');

  if (!clientSlug) {
    console.warn('[milestone.js] No client slug found');
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetch all milestones for this client from Supabase
   * @returns {Promise<Array>} Array of milestone objects
   */
  async function fetchMilestones() {
    try {
      const { data, error } = await window.supabaseClient
        .from('milestone_assessments')
        .select('*')
        .eq('client_slug', clientSlug)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('[milestone.js] Error fetching milestones:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('[milestone.js] Fetch failed:', err);
      return [];
    }
  }

  /**
   * Calculate current day in the program
   * @returns {number} Days since cohort start
   */
  function getCurrentDay() {
    if (!cohortStart) return 0;
    const start = new Date(cohortStart);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION UPDATES
  // ═══════════════════════════════════════════════════════════════════════════

  // Map milestone types to navigation data-page values
  const MILESTONE_NAV_MAP = {
    'initial': 'assessment',
    '30-day': 'assessment-30day',
    '60-day': 'assessment-60day',
    '90-day': 'assessment-90day'
  };

  /**
   * Update navigation accordion items based on milestone status
   * @param {Array} milestones - Array of milestone objects
   */
  function updateMilestoneNav(milestones) {
    const currentDay = getCurrentDay();

    milestones.forEach(milestone => {
      const navPageId = MILESTONE_NAV_MAP[milestone.milestone_type];
      if (!navPageId) return;

      const navItem = document.querySelector(`[data-page="${navPageId}"]`);
      if (!navItem) return;

      const dot = navItem.querySelector('.milestone-dot');
      if (!dot) return;

      // Remove all state classes
      dot.classList.remove('completed', 'pending', 'locked', 'generating');
      navItem.classList.remove('locked', 'generating');

      if (milestone.status === 'completed') {
        // Completed: show checkmark, allow navigation
        dot.classList.add('completed');
        navItem.onclick = function(e) {
          e.preventDefault();
          if (typeof window.navigateMilestone === 'function') {
            window.navigateMilestone(navPageId);
          }
        };
      } else if (milestone.status === 'generating' || milestone.status === 'scheduled') {
        // Generating: show spinner, show generating message
        dot.classList.add('generating');
        navItem.classList.add('generating');
        navItem.onclick = function(e) {
          e.preventDefault();
          showMilestoneGenerating(milestone.milestone_type);
        };
      } else {
        // Pending/locked: determine if it should be accessible
        const daysForMilestone = {
          'initial': 0,
          '30-day': 30,
          '60-day': 60,
          '90-day': 90
        };
        const requiredDays = daysForMilestone[milestone.milestone_type] || 0;

        if (currentDay >= requiredDays) {
          // Past due date but not yet generated - show as pending
          dot.classList.add('pending');
          navItem.onclick = function(e) {
            e.preventDefault();
            showMilestonePending(milestone.milestone_type);
          };
        } else {
          // Future milestone - locked
          dot.classList.add('locked');
          navItem.classList.add('locked');
          navItem.onclick = function(e) {
            e.preventDefault();
            if (typeof window.showMilestoneLocked === 'function') {
              window.showMilestoneLocked(milestone.milestone_type);
            }
          };
        }
      }
    });
  }

  /**
   * Show toast for milestone currently generating
   * @param {string} milestoneType - e.g., '30-day'
   */
  function showMilestoneGenerating(milestoneType) {
    const dayNumber = milestoneType.replace('-day', '');
    showToast(
      `Your ${dayNumber}-day assessment is being generated. This usually takes 2-3 minutes.`,
      'generating'
    );
  }

  /**
   * Show toast for milestone pending generation
   * @param {string} milestoneType - e.g., '30-day'
   */
  function showMilestonePending(milestoneType) {
    const dayNumber = milestoneType.replace('-day', '');
    showToast(
      `Your ${dayNumber}-day assessment is ready to generate and will be available soon.`,
      'pending'
    );
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type: 'locked', 'generating', 'pending'
   */
  function showToast(message, type = 'info') {
    // Remove any existing toast
    const existingToast = document.querySelector('.milestone-toast');
    if (existingToast) existingToast.remove();

    const icons = {
      locked: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
      generating: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      pending: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
    };

    const toast = document.createElement('div');
    toast.className = 'milestone-toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${icons[type] || icons.pending}
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));

    // Remove after 4 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DYNAMIC CONTENT RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Render milestone page content dynamically from Supabase data
   * @param {Object} milestone - Milestone object from database
   * @param {Object} initialMilestone - Initial assessment for comparison
   */
  function renderMilestonePage(milestone, initialMilestone) {
    if (milestone.status !== 'completed' || !milestone.assessment_data) {
      return;
    }

    const pageIdMap = {
      '30-day': 'page-assessment-30day',
      '60-day': 'page-assessment-60day',
      '90-day': 'page-assessment-90day'
    };

    const pageId = pageIdMap[milestone.milestone_type];
    if (!pageId) return;

    const page = document.getElementById(pageId);
    if (!page) return;

    const data = milestone.assessment_data;
    const initial = initialMilestone;

    // Update hero subtitle with executive summary
    const subtitle = page.querySelector('.milestone-hero-subtitle');
    if (subtitle && data.executive_summary) {
      subtitle.textContent = data.executive_summary;
    }

    // Update score comparison cards
    updateScoreCards(page, milestone, initial);

    // Update category progress grid
    updateCategoryGrid(page, milestone, initial);

    // Update key wins
    updateKeyWins(page, data);

    // Update focus areas / next priorities
    updateFocusAreas(page, data);

    console.log(`[milestone.js] Rendered ${milestone.milestone_type} page`);
  }

  /**
   * Update score comparison cards
   */
  function updateScoreCards(page, milestone, initial) {
    // Initial score card
    const initialCard = page.querySelector('.milestone-score-card.initial');
    if (initialCard && initial) {
      const initialValue = initialCard.querySelector('.milestone-score-value');
      const initialGrade = initialCard.querySelector('.milestone-score-grade');
      if (initialValue) initialValue.textContent = initial.overall_score;
      if (initialGrade) initialGrade.textContent = `Grade ${initial.overall_grade}`;
    }

    // Current score card
    const currentCard = page.querySelector('.milestone-score-card.current');
    if (currentCard) {
      const currentValue = currentCard.querySelector('.milestone-score-value');
      const currentGrade = currentCard.querySelector('.milestone-score-grade');
      const deltaBadge = currentCard.querySelector('.milestone-delta-badge');

      if (currentValue) currentValue.textContent = milestone.overall_score;
      if (currentGrade) currentGrade.textContent = `Grade ${milestone.overall_grade}`;

      if (deltaBadge && milestone.score_delta !== null) {
        const delta = milestone.score_delta;
        deltaBadge.textContent = delta >= 0 ? `+${delta} points` : `${delta} points`;
        deltaBadge.className = `milestone-delta-badge ${delta >= 0 ? 'positive' : 'negative'}`;
      }
    }

    // For 60-day and 90-day, update middle score cards if present
    const middleCards = page.querySelectorAll('.milestone-score-card:not(.initial):not(.current)');
    // These would need additional milestone data to populate correctly
  }

  /**
   * Update category progress grid
   */
  function updateCategoryGrid(page, milestone, initial) {
    const categoryDeltas = milestone.category_deltas;
    if (!categoryDeltas) return;

    const categoryGrid = page.querySelector('.milestone-category-grid');
    if (!categoryGrid) return;

    const categoryItems = categoryGrid.querySelectorAll('.milestone-category-item');

    // Category name mapping
    const categoryNames = {
      'website_technical': 'Website & Technical',
      'reviews_reputation': 'Reviews & Reputation',
      'online_booking': 'Online Booking',
      'social_media': 'Social Media',
      'guest_experience': 'Guest Experience',
      'local_visibility': 'Local Visibility'
    };

    const categoryKeys = Object.keys(categoryDeltas);

    categoryItems.forEach((item, index) => {
      const key = categoryKeys[index];
      if (!key || !categoryDeltas[key]) return;

      const delta = categoryDeltas[key];
      const displayName = categoryNames[key] || key;

      // Update category name
      const nameEl = item.querySelector('.milestone-category-name');
      if (nameEl) nameEl.textContent = displayName;

      // Update delta badge
      const changeEl = item.querySelector('.milestone-category-change');
      if (changeEl && delta.delta !== null) {
        changeEl.textContent = delta.delta >= 0 ? `+${delta.delta}` : `${delta.delta}`;
        changeEl.className = `milestone-category-change ${delta.delta >= 0 ? 'positive' : delta.delta < 0 ? 'negative' : 'neutral'}`;
      }

      // Update score progression
      const beforeEl = item.querySelector('.score-before');
      const afterEl = item.querySelector('.score-after');
      if (beforeEl && delta.initial !== null) beforeEl.textContent = delta.initial;
      if (afterEl && delta.current !== null) afterEl.textContent = delta.current;
    });
  }

  /**
   * Update key wins section
   */
  function updateKeyWins(page, data) {
    const winsList = page.querySelector('.milestone-wins-list');
    if (!winsList || !data.improvements || data.improvements.length === 0) return;

    // Clear existing wins and rebuild from data
    // Only if we have actual improvement data
    const improvements = data.improvements.slice(0, 4); // Max 4 wins

    const winItems = winsList.querySelectorAll('.milestone-win-item');
    winItems.forEach((item, index) => {
      if (improvements[index]) {
        const span = item.querySelector('span');
        if (span) {
          const imp = improvements[index];
          span.textContent = `${imp.category}: +${imp.delta} points (${imp.from_score} to ${imp.to_score})`;
        }
      }
    });
  }

  /**
   * Update focus areas / next priorities
   */
  function updateFocusAreas(page, data) {
    const focusList = page.querySelector('.milestone-focus-list');
    if (!focusList || !data.next_priorities || data.next_priorities.length === 0) return;

    const priorities = data.next_priorities.slice(0, 3); // Max 3 focus areas

    const focusItems = focusList.querySelectorAll('.milestone-focus-item');
    focusItems.forEach((item, index) => {
      if (priorities[index]) {
        const priority = priorities[index];
        const title = item.querySelector('h4');
        const desc = item.querySelector('p');

        if (title) title.textContent = priority.focus_area || priority.category;
        if (desc) desc.textContent = `Current score: ${priority.current_score} (${priority.grade})`;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POLLING FOR STATUS UPDATES
  // ═══════════════════════════════════════════════════════════════════════════

  let pollInterval = null;

  /**
   * Start polling for milestone status updates
   * Used when a milestone is in 'generating' status
   */
  function startPolling() {
    if (pollInterval) return; // Already polling

    pollInterval = setInterval(async () => {
      const milestones = await fetchMilestones();
      const generating = milestones.filter(m => m.status === 'generating' || m.status === 'scheduled');

      if (generating.length === 0) {
        // Nothing generating, stop polling and refresh
        stopPolling();
        await refreshMilestones();
      } else {
        // Update nav states
        updateMilestoneNav(milestones);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop polling for status updates
   */
  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  /**
   * Refresh all milestone data and update UI
   */
  async function refreshMilestones() {
    const milestones = await fetchMilestones();
    updateMilestoneNav(milestones);

    const initial = milestones.find(m => m.milestone_type === 'initial');

    // Render completed milestone pages
    milestones
      .filter(m => m.status === 'completed' && m.milestone_type !== 'initial')
      .forEach(m => renderMilestonePage(m, initial));

    // Check if any are generating
    const generating = milestones.filter(m => m.status === 'generating' || m.status === 'scheduled');
    if (generating.length > 0) {
      startPolling();
    }

    window.__milestoneData = milestones;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('[milestone.js] Initializing for client:', clientSlug);

  const milestones = await fetchMilestones();

  if (milestones.length > 0) {
    console.log('[milestone.js] Found', milestones.length, 'milestones');
    updateMilestoneNav(milestones);

    const initial = milestones.find(m => m.milestone_type === 'initial');

    // Render completed milestone pages (except initial which is static)
    milestones
      .filter(m => m.status === 'completed' && m.milestone_type !== 'initial')
      .forEach(m => renderMilestonePage(m, initial));

    // Check if any milestones are generating
    const generating = milestones.filter(m => m.status === 'generating' || m.status === 'scheduled');
    if (generating.length > 0) {
      console.log('[milestone.js] Milestones generating, starting poll');
      startPolling();
    }
  } else {
    console.log('[milestone.js] No milestones found for this client');
  }

  // Expose for external use
  window.__milestoneData = milestones;
  window.__refreshMilestones = refreshMilestones;

  // Listen for cohort date updates (from auth.js)
  window.addEventListener('cohortDateUpdated', async () => {
    console.log('[milestone.js] Cohort date updated, refreshing milestones');
    await refreshMilestones();
  });

})();
