// editor-bridge.js
// Injected into dashboard iframe to enable WYSIWYG editing.
// Communicates with parent editor via postMessage.

(function() {
  'use strict';

  // ──────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ──────────────────────────────────────────────────────────────────────────

  const EDITABLE_SELECTOR = '[data-editable-key]';
  const EDITABLE_LINK_SELECTOR = '[data-editable-link]';
  const ALLOWED_ORIGINS = [
    'https://accelerator.elearningu.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  // Debug logging (set to false for production)
  const DEBUG = false;
  function log(...args) {
    if (DEBUG) console.log('[editor-bridge]', ...args);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────────────

  let selectedElement = null;
  let selectedKey = null;
  let dropZonesEnabled = false;
  let isInitialized = false;

  // Track original content for change detection
  const originalContent = new Map();

  // ──────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ──────────────────────────────────────────────────────────────────────────

  function isAllowedOrigin(origin) {
    // Always allow same-origin (when parent is the same domain)
    if (origin === window.location.origin) {
      return true;
    }
    // Check against whitelist
    return ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.startsWith(allowed));
  }

  function sendToParent(event) {
    if (window.parent && window.parent !== window) {
      log('Sending to parent:', event.type);
      window.parent.postMessage({ source: 'editor-bridge', ...event }, '*');
    }
  }

  function getElementType(el) {
    if (el.hasAttribute('data-editable-link')) return 'link';
    if (el.tagName === 'IMG') return 'image';
    if (el.querySelector('img')) return 'image-container';
    return 'text';
  }

  function getElementPath(el) {
    const path = [];
    let current = el;

    while (current && current !== document.body) {
      // Look for meaningful containers
      const page = current.closest('.page');
      if (page) {
        const pageId = page.id?.replace('page-', '') || 'unknown';
        path.unshift(pageId);
        break;
      }

      // Check for section headers
      const header = current.querySelector('h1, h2, h3');
      if (header && current !== el) {
        path.unshift(header.textContent.trim().substring(0, 30));
      }

      current = current.parentElement;
    }

    // Add element's own identifier
    const key = el.getAttribute('data-editable-key') || el.getAttribute('data-editable-link');
    if (key) {
      path.push(key);
    }

    return path.join(' > ');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ELEMENT DISCOVERY
  // ──────────────────────────────────────────────────────────────────────────

  function getEditableElements() {
    const elements = [];

    // Get text editable elements
    document.querySelectorAll(EDITABLE_SELECTOR).forEach(el => {
      const key = el.getAttribute('data-editable-key');
      elements.push({
        key,
        type: getElementType(el),
        content: el.innerHTML,
        path: getElementPath(el),
        tagName: el.tagName.toLowerCase(),
      });

      // Store original content
      if (!originalContent.has(key)) {
        originalContent.set(key, el.innerHTML);
      }
    });

    // Get link editable elements
    document.querySelectorAll(EDITABLE_LINK_SELECTOR).forEach(el => {
      const key = el.getAttribute('data-editable-link');
      elements.push({
        key,
        type: 'link',
        content: JSON.stringify({
          text: el.textContent,
          href: el.getAttribute('href') || '',
        }),
        path: getElementPath(el),
        tagName: el.tagName.toLowerCase(),
      });

      // Store original content
      if (!originalContent.has(key)) {
        originalContent.set(key, JSON.stringify({
          text: el.textContent,
          href: el.getAttribute('href') || '',
        }));
      }
    });

    return elements;
  }

  function getElementByKey(key) {
    return document.querySelector(`[data-editable-key="${key}"]`) ||
           document.querySelector(`[data-editable-link="${key}"]`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SELECTION & HIGHLIGHTING
  // ──────────────────────────────────────────────────────────────────────────

  function clearSelection() {
    if (selectedElement) {
      selectedElement.classList.remove('bridge-selected');
      selectedElement.removeAttribute('contenteditable');
    }
    selectedElement = null;
    selectedKey = null;
  }

  function selectElement(key) {
    clearSelection();

    const el = getElementByKey(key);
    if (!el) {
      log('selectElement: Element not found for key:', key);
      return false;
    }

    log('selectElement: Found element, selecting:', key);
    selectedElement = el;
    selectedKey = key;
    el.classList.add('bridge-selected');

    // Make text elements contenteditable
    if (el.hasAttribute('data-editable-key')) {
      el.setAttribute('contenteditable', 'true');
      el.focus();
    }

    // Scroll into view
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Notify parent of selection (so inspector can update)
    sendToParent({
      type: 'ELEMENT_SELECTED',
      key,
      content: getElementContent(key),
      elementType: getElementType(el),
      path: getElementPath(el),
    });

    return true;
  }

  function highlightElement(key, highlight = true) {
    const el = getElementByKey(key);
    if (!el) return false;

    if (highlight) {
      el.classList.add('bridge-highlight');
    } else {
      el.classList.remove('bridge-highlight');
    }

    return true;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CONTENT MANIPULATION
  // ──────────────────────────────────────────────────────────────────────────

  function getElementContent(key) {
    const el = getElementByKey(key);
    if (!el) return null;

    if (el.hasAttribute('data-editable-link')) {
      return JSON.stringify({
        text: el.textContent,
        href: el.getAttribute('href') || '',
      });
    }

    return el.innerHTML;
  }

  function setElementContent(key, content) {
    const el = getElementByKey(key);
    if (!el) return false;

    if (el.hasAttribute('data-editable-link')) {
      try {
        const { text, href } = JSON.parse(content);
        el.textContent = text;
        if (href) el.setAttribute('href', href);
      } catch (e) {
        // If not JSON, treat as plain text
        el.textContent = content;
      }
    } else {
      el.innerHTML = content;
    }

    // Mark as changed if different from original
    const original = originalContent.get(key);
    if (original !== content) {
      el.classList.add('bridge-changed');
    } else {
      el.classList.remove('bridge-changed');
    }

    return true;
  }

  function insertMediaAtElement(key, mediaHtml) {
    const el = getElementByKey(key);
    if (!el) return false;

    // For text elements, append the media
    if (el.hasAttribute('data-editable-key')) {
      el.innerHTML += mediaHtml;
      el.classList.add('bridge-changed');

      // Notify parent of change
      sendToParent({
        type: 'CONTENT_CHANGED',
        key,
        content: el.innerHTML,
      });
    }

    return true;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DROP ZONES
  // ──────────────────────────────────────────────────────────────────────────

  function enableDropZones() {
    if (dropZonesEnabled) return;
    dropZonesEnabled = true;

    document.querySelectorAll(EDITABLE_SELECTOR).forEach(el => {
      el.classList.add('bridge-drop-zone');

      el.addEventListener('dragenter', handleDragEnter);
      el.addEventListener('dragleave', handleDragLeave);
      el.addEventListener('dragover', handleDragOver);
      el.addEventListener('drop', handleDrop);
    });

    document.body.classList.add('bridge-drop-mode');
  }

  function disableDropZones() {
    if (!dropZonesEnabled) return;
    dropZonesEnabled = false;

    document.querySelectorAll(EDITABLE_SELECTOR).forEach(el => {
      el.classList.remove('bridge-drop-zone', 'bridge-drop-active');

      el.removeEventListener('dragenter', handleDragEnter);
      el.removeEventListener('dragleave', handleDragLeave);
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('drop', handleDrop);
    });

    document.body.classList.remove('bridge-drop-mode');
  }

  function handleDragEnter(e) {
    e.preventDefault();
    e.target.classList.add('bridge-drop-active');

    const key = e.target.getAttribute('data-editable-key');
    sendToParent({ type: 'DROP_ZONE_ENTER', key });
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.target.classList.remove('bridge-drop-active');

    const key = e.target.getAttribute('data-editable-key');
    sendToParent({ type: 'DROP_ZONE_LEAVE', key });
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  function handleDrop(e) {
    e.preventDefault();
    e.target.classList.remove('bridge-drop-active');

    const key = e.target.getAttribute('data-editable-key');
    const rect = e.target.getBoundingClientRect();

    sendToParent({
      type: 'MEDIA_DROPPED',
      key,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EVENT HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  function handleElementClick(e) {
    const el = e.target.closest(EDITABLE_SELECTOR) || e.target.closest(EDITABLE_LINK_SELECTOR);
    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    const key = el.getAttribute('data-editable-key') || el.getAttribute('data-editable-link');
    selectElement(key);

    sendToParent({
      type: 'ELEMENT_SELECTED',
      key,
      content: getElementContent(key),
      elementType: getElementType(el),
      path: getElementPath(el),
    });
  }

  function handleElementInput(e) {
    const el = e.target.closest(EDITABLE_SELECTOR);
    if (!el) return;

    const key = el.getAttribute('data-editable-key');
    const content = el.innerHTML;

    // Mark as changed
    const original = originalContent.get(key);
    if (original !== content) {
      el.classList.add('bridge-changed');
    } else {
      el.classList.remove('bridge-changed');
    }

    // Notify parent
    sendToParent({
      type: 'CONTENT_CHANGED',
      key,
      content,
    });
  }

  function handleKeyDown(e) {
    // Cmd/Ctrl+S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      sendToParent({ type: 'SAVE_REQUESTED' });
    }

    // Escape to deselect
    if (e.key === 'Escape') {
      clearSelection();
      sendToParent({ type: 'SELECTION_CLEARED' });
    }
  }

  function handleBeforeUnload(e) {
    // Check for unsaved changes
    const hasChanges = document.querySelector('.bridge-changed');
    if (hasChanges) {
      e.preventDefault();
      e.returnValue = '';
      sendToParent({ type: 'NAVIGATION_BLOCKED' });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MESSAGE HANDLER
  // ──────────────────────────────────────────────────────────────────────────

  function handleMessage(e) {
    // Verify origin
    if (!isAllowedOrigin(e.origin)) {
      log('Rejected message from unknown origin:', e.origin, '(allowed:', ALLOWED_ORIGINS, ')');
      return;
    }

    const { type, ...payload } = e.data || {};

    // Ignore messages without a type (not for us)
    if (!type) return;

    log('Received message:', type);

    switch (type) {
      case 'INIT':
        log('Initializing bridge...');
        initialize();
        break;

      case 'SELECT_ELEMENT':
        log('SELECT_ELEMENT received for key:', payload.key);
        selectElement(payload.key);
        break;

      case 'HIGHLIGHT_ELEMENT':
        highlightElement(payload.key, payload.highlight !== false);
        break;

      case 'SET_CONTENT':
        setElementContent(payload.key, payload.content);
        break;

      case 'INSERT_MEDIA':
        insertMediaAtElement(payload.key, payload.html);
        break;

      case 'ENABLE_DROP_ZONES':
        enableDropZones();
        break;

      case 'DISABLE_DROP_ZONES':
        disableDropZones();
        break;

      case 'SCROLL_TO_ELEMENT':
        const el = getElementByKey(payload.key);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;

      case 'GET_CONTENT':
        sendToParent({
          type: 'CONTENT_RESPONSE',
          key: payload.key,
          content: getElementContent(payload.key),
        });
        break;

      case 'GET_ALL_CHANGES':
        const changes = [];
        document.querySelectorAll('.bridge-changed').forEach(el => {
          const key = el.getAttribute('data-editable-key') || el.getAttribute('data-editable-link');
          if (key) {
            changes.push({
              key,
              content: getElementContent(key),
              original: originalContent.get(key),
            });
          }
        });
        sendToParent({ type: 'ALL_CHANGES_RESPONSE', changes });
        break;

      case 'MARK_SAVED':
        // Clear change indicators for saved keys
        (payload.keys || []).forEach(key => {
          const el = getElementByKey(key);
          if (el) {
            el.classList.remove('bridge-changed');
            originalContent.set(key, getElementContent(key));
          }
        });
        break;

      case 'CLEAR_SELECTION':
        clearSelection();
        break;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────────────────────────────────────

  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'editor-bridge-styles';
    style.textContent = `
      /* Selected element */
      .bridge-selected {
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px !important;
        background-color: rgba(59, 130, 246, 0.05) !important;
      }

      /* Highlighted element (hover from parent) */
      .bridge-highlight {
        outline: 2px dashed #3b82f6 !important;
        outline-offset: 2px !important;
      }

      /* Changed element */
      .bridge-changed {
        background-color: rgba(251, 191, 36, 0.1) !important;
      }

      /* Drop zone mode */
      .bridge-drop-mode [data-editable-key] {
        transition: all 0.15s ease;
      }

      .bridge-drop-zone {
        outline: 2px dashed #94a3b8 !important;
        outline-offset: 2px !important;
      }

      .bridge-drop-active {
        outline: 3px solid #22c55e !important;
        outline-offset: 2px !important;
        background-color: rgba(34, 197, 94, 0.1) !important;
      }

      /* Prevent pointer events on non-editable elements in edit mode */
      /* But allow navigation elements to still work */
      body.bridge-edit-mode a:not([data-editable-link]):not(.nav-item):not(.tactic-tab):not([data-page]):not(.howto-link):not(.week-toggle) {
        pointer-events: none !important;
      }
      body.bridge-edit-mode button:not(.bridge-allowed):not(.tactic-tab):not(.nav-item):not(.howto-link):not(.week-toggle):not([data-page]) {
        pointer-events: none !important;
      }
      body.bridge-edit-mode input:not(.bridge-allowed):not([type="checkbox"]) {
        pointer-events: none !important;
      }

      /* Editable elements cursor */
      body.bridge-edit-mode [data-editable-key],
      body.bridge-edit-mode [data-editable-link] {
        cursor: pointer !important;
      }

      body.bridge-edit-mode [data-editable-key]:hover,
      body.bridge-edit-mode [data-editable-link]:hover {
        outline: 2px dashed #94a3b8;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  function initialize() {
    if (isInitialized) {
      // Already initialized, just send ready again
      const elements = getEditableElements();
      log('Already initialized, resending READY with', elements.length, 'elements');
      sendToParent({
        type: 'READY',
        elements: elements,
        clientSlug: document.body.getAttribute('data-client-slug'),
      });
      return;
    }

    log('Starting initialization...');

    // Inject styles
    injectStyles();

    // Enable edit mode
    document.body.classList.add('bridge-edit-mode');

    // Set up event listeners
    document.addEventListener('click', handleElementClick, true);
    document.addEventListener('input', handleElementInput, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Block navigation
    document.querySelectorAll('a:not([data-editable-link])').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        sendToParent({ type: 'NAVIGATION_BLOCKED', href: a.href });
      });
    });

    isInitialized = true;

    // Notify parent we're ready
    const elements = getEditableElements();
    log('Initialization complete. Found', elements.length, 'editable elements');
    sendToParent({
      type: 'READY',
      elements: elements,
      clientSlug: document.body.getAttribute('data-client-slug'),
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // START
  // ──────────────────────────────────────────────────────────────────────────

  // Listen for messages from parent
  window.addEventListener('message', handleMessage);

  // Auto-initialize if loaded directly (not via postMessage)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Wait for parent to send INIT command
      // Or auto-init if we detect we're in an iframe
      if (window.parent !== window) {
        log('DOM ready, notifying parent that bridge is loaded');
        sendToParent({ type: 'BRIDGE_LOADED' });
      }
    });
  } else {
    if (window.parent !== window) {
      log('Script loaded (DOM already ready), notifying parent that bridge is loaded');
      sendToParent({ type: 'BRIDGE_LOADED' });
    }
  }

  log('Editor bridge script initialized, waiting for parent...');

})();
