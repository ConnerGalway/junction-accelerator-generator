/* ==========================================================================
   Junction Consulting: motion

   Principles applied here:
     - Motion is progressive enhancement. Every element is readable without it,
       and a failure to load this file un-hides the page rather than blanking it.
     - Reveals fire once. Nothing re-animates on scroll-back.
     - Counters run on requestAnimationFrame, not setInterval, so they stay in
       step with the compositor instead of fighting it.
     - prefers-reduced-motion removes movement, not information.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;

  /* --- Reveal ------------------------------------------------------------ */

  // Children of a [data-stagger] container inherit an increasing delay so they
  // cascade instead of landing all at once. 60ms reads as one gesture; much
  // more than that and the group starts to feel slow.
  var STAGGER_MS = 60;

  Array.prototype.forEach.call(document.querySelectorAll('[data-stagger]'), function (group) {
    var items = group.querySelectorAll('[data-reveal]');
    Array.prototype.forEach.call(items, function (item, i) {
      if (!item.style.getPropertyValue('--delay')) {
        item.style.setProperty('--delay', i * STAGGER_MS + 'ms');
      }
    });
  });

  function showAll() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-reveal]'), function (el) {
      el.classList.add('is-in');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.route'), function (el) {
      el.classList.add('is-in');
    });
  }

  if (!canObserve) {
    // No IntersectionObserver: show everything rather than gating content on it.
    showAll();
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        });
      },
      // Fire slightly before the element reaches the fold so the motion has
      // already resolved by the time it is properly in view.
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );

    Array.prototype.forEach.call(document.querySelectorAll('[data-reveal], .route'), function (el) {
      revealObserver.observe(el);
    });
  }

  /* --- Hero -------------------------------------------------------------- */

  // The hero is above the fold, so it plays on load rather than on scroll.
  var hero = document.getElementById('hero');
  if (hero) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        hero.classList.add('is-in');
      });
    });
  }

  // Only now tell the head-script failsafe to stop counting down. Claiming it
  // any earlier would mean a throw in the setup above leaves the page hidden at
  // opacity 0 with the safety net already switched off. Anything below this
  // line can fail without taking the content with it.
  root.setAttribute('data-motion-ready', '');

  /* --- Header ------------------------------------------------------------ */

  var header = document.getElementById('site-header');
  if (header) {
    var scrolled = false;
    var onScroll = function () {
      var next = window.scrollY > 8;
      if (next === scrolled) return; // Only touch the DOM on an actual change.
      scrolled = next;
      if (next) header.setAttribute('data-scrolled', '');
      else header.removeAttribute('data-scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* --- Mobile menu ------------------------------------------------------- */

  var toggle = document.getElementById('nav-toggle');
  var menu = document.getElementById('menu');

  if (toggle && menu) {
    var menuOpen = false;

    var setMenu = function (open) {
      menuOpen = open;
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');

      // Keep the closed menu out of the tab order and off the a11y tree.
      if (open) menu.removeAttribute('inert');
      else menu.setAttribute('inert', '');

      // Stop the page scrolling behind the overlay.
      document.body.style.overflow = open ? 'hidden' : '';

      if (open) {
        var first = menu.querySelector('a');
        if (first) first.focus();
      }
    };

    menu.setAttribute('inert', '');

    toggle.addEventListener('click', function () {
      setMenu(!menuOpen);
    });

    // Any destination closes the menu, and focus goes back to the control that
    // opened it rather than to the top of the document.
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        setMenu(false);
        toggle.focus();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuOpen) {
        setMenu(false);
        toggle.focus();
      }
    });

    // Leaving the breakpoint while open would strand the overlay.
    window.matchMedia('(min-width: 60.0625rem)').addEventListener('change', function (e) {
      if (e.matches && menuOpen) setMenu(false);
    });
  }

  /* --- Counters ---------------------------------------------------------- */

  function format(el, value) {
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    return prefix + Math.round(value).toLocaleString('en-US') + suffix;
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;

    var duration = 1400;
    var start = null;

    function frame(now) {
      if (start === null) start = now;
      var p = Math.min(1, (now - start) / duration);
      // easeOutCubic: most of the distance is covered early, so the number
      // feels decisive and settles rather than crawling.
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(el, target * eased);
      if (p < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  var counters = document.querySelectorAll('[data-count]');

  if (reduced || !canObserve) {
    // Leave the server-rendered final values in place.
  } else {
    // Reserve the final width before zeroing, so the surrounding layout does
    // not reflow as digits are added.
    Array.prototype.forEach.call(counters, function (el) {
      el.style.minWidth = el.getBoundingClientRect().width + 'px';
      el.style.display = 'inline-block';
      el.textContent = format(el, 0);
    });

    var countObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          countUp(entry.target);
          countObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );

    Array.prototype.forEach.call(counters, function (el) {
      countObserver.observe(el);
    });
  }

  /* --- Progress bar ------------------------------------------------------ */

  var bars = document.querySelectorAll('[data-progress]');

  if (reduced || !canObserve) {
    Array.prototype.forEach.call(bars, function (el) {
      el.classList.add('is-in');
    });
  } else {
    var barObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          // A short beat after the card lands, so the two do not compete.
          setTimeout(function () {
            entry.target.classList.add('is-in');
          }, 260);
          barObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );

    Array.prototype.forEach.call(bars, function (el) {
      barObserver.observe(el);
    });
  }

  /* --- Catalogue filters ------------------------------------------------- */

  // Chips filter a grid in place. The grid dips to opacity 0, the swap happens
  // while nothing is visible, then it comes back. One move rather than a dozen
  // cards reflowing in front of the reader.
  Array.prototype.forEach.call(document.querySelectorAll('[data-filter-group]'), function (group) {
    var key = group.getAttribute('data-filter-group');
    var grid = document.querySelector('[data-filter-target="' + key + '"]');
    if (!grid) return;

    var items = Array.prototype.slice.call(grid.children);
    var empty = document.querySelector('[data-filter-empty="' + key + '"]');
    var live = document.querySelector('[data-filter-count="' + key + '"]');
    var chips = Array.prototype.slice.call(group.querySelectorAll('.chip'));
    var swapTimer = null;

    var noun = group.getAttribute('data-filter-noun') || 'items';

    // `force` marks a user-initiated filter change. Items further down the grid
    // may never have been scroll-revealed, and a filter that surfaces them must
    // not leave them sitting at opacity 0 as blank space. The initial call
    // passes force = false so the reveal-on-scroll still plays on first load.
    function commit(value, force) {
      var shown = 0;
      items.forEach(function (el) {
        var match = value === 'All' || el.getAttribute('data-kind') === value;
        el.hidden = !match;
        if (match) {
          shown++;
          if (force) el.classList.add('is-in');
        }
      });
      if (empty) empty.hidden = shown !== 0;
      if (live) {
        live.textContent =
          shown + ' ' + (shown === 1 ? noun.replace(/s$/, '') : noun) + ' shown';
      }
      return shown;
    }

    function select(chip) {
      var value = chip.getAttribute('data-filter');

      chips.forEach(function (c) {
        c.setAttribute('aria-pressed', String(c === chip));
      });

      if (reduced) {
        commit(value, true);
        return;
      }

      grid.classList.add('is-swapping');
      clearTimeout(swapTimer);
      swapTimer = setTimeout(function () {
        commit(value, true);
        grid.classList.remove('is-swapping');
      }, 140);
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        select(chip);
      });
    });

    // Establish the starting count for assistive tech without animating.
    var initial = chips.filter(function (c) {
      return c.getAttribute('aria-pressed') === 'true';
    })[0];
    if (initial) commit(initial.getAttribute('data-filter'), false);
  });

  /* --- Newsletter -------------------------------------------------------- */

  // No endpoint is wired up yet. Confirm in place rather than navigating away,
  // and keep the announcement available to screen readers.
  Array.prototype.forEach.call(document.querySelectorAll('[data-newsletter]'), function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input');
      if (!input || !input.value) return;

      var button = form.querySelector('button');
      if (button) {
        button.textContent = 'Subscribed';
        button.disabled = true;
        button.style.opacity = '0.75';
      }
      input.disabled = true;

      var note = document.createElement('p');
      note.className = 'small';
      note.setAttribute('role', 'status');
      note.style.marginTop = '0.75rem';
      note.textContent = 'Check your inbox to confirm. First issue lands Monday.';
      form.insertAdjacentElement('afterend', note);
    });
  });
})();
