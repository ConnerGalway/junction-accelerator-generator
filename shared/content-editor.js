// content-editor.js
// Enables Admin/PSM/Coach users to edit text content in assessments and accelerator plans.
// Edits are saved to the content_edits table and applied on page load for all users.

(async function () {
  'use strict';

  // ──────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ──────────────────────────────────────────────────────────────────────────

  const API_BASE = '/.netlify/functions';
  const EDITABLE_SELECTOR = '[data-editable-key]';
  const EDITABLE_LINK_SELECTOR = '[data-editable-link]';

  // ──────────────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────────────

  const clientSlug = document.body.getAttribute('data-client-slug');
  if (!clientSlug) {
    console.warn('content-editor: No client slug found, skipping initialization');
    return;
  }

  // Track pending changes: { contentKey: { editedValue, originalValue } }
  const pendingChanges = new Map();

  // Store original values for elements (set on first edit)
  const originalValues = new Map();

  // Store original link values: { text, href }
  const originalLinkValues = new Map();

  // Currently active link editor popover
  let activeLinkPopover = null;

  // User role (set after auth resolves)
  let userRole = null;
  let canEdit = false;

  // ──────────────────────────────────────────────────────────────────────────
  // UI COMPONENTS
  // ──────────────────────────────────────────────────────────────────────────

  // Create the floating save button
  function createSaveButton() {
    const btn = document.createElement('button');
    btn.id = 'content-edit-save-btn';
    btn.innerHTML = `
      <span class="save-icon">💾</span>
      <span class="save-text">Save Changes</span>
    `;
    btn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: none;
      align-items: center;
      gap: 8px;
      padding: 14px 24px;
      background: #11154b;
      color: #aadab6;
      border: none;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(17,21,75,0.3);
      transition: all 0.2s ease;
    `;
    btn.onmouseenter = () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 6px 24px rgba(17,21,75,0.4)';
    };
    btn.onmouseleave = () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 4px 20px rgba(17,21,75,0.3)';
    };
    btn.onclick = saveChanges;
    document.body.appendChild(btn);
    return btn;
  }

  // Create toast notification
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'content-edit-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 24px;
      z-index: 10000;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      background: ${type === 'success' ? '#2d8a4e' : '#c53030'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Inject CSS for animations and editable styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes slideOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(20px); }
      }

      /* Editable element styles (only when edit mode is on) */
      body:not([data-readonly="true"]) [data-editable-key] {
        cursor: text;
        transition: outline 0.15s ease, background-color 0.15s ease;
        border-radius: 4px;
      }
      body:not([data-readonly="true"]) [data-editable-key]:hover {
        outline: 2px dashed #4a90d9;
        outline-offset: 2px;
      }
      body:not([data-readonly="true"]) [data-editable-key]:focus {
        outline: 2px solid #4a90d9;
        outline-offset: 2px;
        background-color: rgba(74, 144, 217, 0.05);
      }

      /* Unsaved changes indicator */
      [data-editable-key].has-unsaved-changes {
        background-color: rgba(255, 193, 7, 0.1) !important;
      }

      /* Save button loading state */
      #content-edit-save-btn.saving {
        opacity: 0.7;
        pointer-events: none;
      }
      #content-edit-save-btn.saving .save-text::after {
        content: '...';
      }

      /* Print: hide save button */
      @media print {
        #content-edit-save-btn { display: none !important; }
      }

      /* Editable link styles (only when edit mode is on) */
      body:not([data-readonly="true"]) [data-editable-link] {
        cursor: pointer;
        transition: outline 0.15s ease, background-color 0.15s ease;
        border-radius: 4px;
        position: relative;
      }
      body:not([data-readonly="true"]) [data-editable-link]:hover {
        outline: 2px dashed #9c27b0;
        outline-offset: 2px;
      }
      body:not([data-readonly="true"]) [data-editable-link].editing {
        outline: 2px solid #9c27b0;
        outline-offset: 2px;
        background-color: rgba(156, 39, 176, 0.05);
      }
      [data-editable-link].has-unsaved-changes {
        background-color: rgba(255, 193, 7, 0.1) !important;
      }

      /* Link editor popover */
      .link-editor-popover {
        position: absolute;
        z-index: 10001;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        padding: 16px;
        min-width: 320px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .link-editor-popover::before {
        content: '';
        position: absolute;
        top: -8px;
        left: 24px;
        width: 16px;
        height: 16px;
        background: white;
        transform: rotate(45deg);
        box-shadow: -2px -2px 4px rgba(0,0,0,0.05);
      }
      .link-editor-field {
        margin-bottom: 12px;
      }
      .link-editor-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #666;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .link-editor-input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .link-editor-input:focus {
        outline: none;
        border-color: #9c27b0;
        box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.1);
      }
      .link-editor-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
      }
      .link-editor-btn {
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .link-editor-btn-cancel {
        background: #f5f5f5;
        border: 1px solid #ddd;
        color: #666;
      }
      .link-editor-btn-cancel:hover {
        background: #eee;
      }
      .link-editor-btn-save {
        background: #9c27b0;
        border: none;
        color: white;
      }
      .link-editor-btn-save:hover {
        background: #7b1fa2;
      }
      @media print {
        .link-editor-popover { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LINK EDITOR
  // ──────────────────────────────────────────────────────────────────────────

  function closeLinkPopover() {
    if (activeLinkPopover) {
      const linkEl = activeLinkPopover._targetLink;
      if (linkEl) linkEl.classList.remove('editing');
      activeLinkPopover.remove();
      activeLinkPopover = null;
    }
  }

  function showLinkEditor(linkEl) {
    // Close any existing popover
    closeLinkPopover();

    const key = linkEl.getAttribute('data-editable-link');
    const currentText = linkEl.textContent;
    const currentHref = linkEl.getAttribute('href') || '';

    // Store original if not already stored
    if (!originalLinkValues.has(key)) {
      originalLinkValues.set(key, { text: currentText, href: currentHref });
    }

    linkEl.classList.add('editing');

    // Create popover
    const popover = document.createElement('div');
    popover.className = 'link-editor-popover';
    popover._targetLink = linkEl;

    popover.innerHTML = `
      <div class="link-editor-field">
        <label class="link-editor-label">Link Text</label>
        <input type="text" class="link-editor-input" id="link-text-input" value="${currentText.replace(/"/g, '&quot;')}">
      </div>
      <div class="link-editor-field">
        <label class="link-editor-label">URL</label>
        <input type="url" class="link-editor-input" id="link-href-input" value="${currentHref.replace(/"/g, '&quot;')}" placeholder="https://...">
      </div>
      <div class="link-editor-actions">
        <button class="link-editor-btn link-editor-btn-cancel" type="button">Cancel</button>
        <button class="link-editor-btn link-editor-btn-save" type="button">Apply</button>
      </div>
    `;

    // Position popover below the link
    const rect = linkEl.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    popover.style.position = 'absolute';
    popover.style.top = (rect.bottom + scrollTop + 12) + 'px';
    popover.style.left = (rect.left + scrollLeft) + 'px';

    document.body.appendChild(popover);
    activeLinkPopover = popover;

    // Focus text input
    const textInput = popover.querySelector('#link-text-input');
    textInput.focus();
    textInput.select();

    // Handle cancel
    popover.querySelector('.link-editor-btn-cancel').onclick = () => {
      closeLinkPopover();
    };

    // Handle save/apply
    popover.querySelector('.link-editor-btn-save').onclick = () => {
      const newText = popover.querySelector('#link-text-input').value;
      const newHref = popover.querySelector('#link-href-input').value;
      applyLinkEdit(linkEl, key, newText, newHref);
      closeLinkPopover();
    };

    // Handle Enter key to save
    popover.querySelectorAll('.link-editor-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const newText = popover.querySelector('#link-text-input').value;
          const newHref = popover.querySelector('#link-href-input').value;
          applyLinkEdit(linkEl, key, newText, newHref);
          closeLinkPopover();
        } else if (e.key === 'Escape') {
          closeLinkPopover();
        }
      });
    });

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 0);
  }

  function handleOutsideClick(e) {
    if (activeLinkPopover && !activeLinkPopover.contains(e.target) && !e.target.closest('[data-editable-link]')) {
      closeLinkPopover();
      document.removeEventListener('click', handleOutsideClick);
    }
  }

  function applyLinkEdit(linkEl, key, newText, newHref) {
    const original = originalLinkValues.get(key) || { text: linkEl.textContent, href: linkEl.getAttribute('href') || '' };

    // Update the link element
    linkEl.textContent = newText;
    linkEl.setAttribute('href', newHref);

    // Check if changed from original
    if (newText !== original.text || newHref !== original.href) {
      // Store as JSON in pending changes with special prefix
      const editValue = JSON.stringify({ text: newText, href: newHref });
      const originalValue = JSON.stringify(original);

      pendingChanges.set('link:' + key, {
        editedValue: editValue,
        originalValue: originalValue
      });
      linkEl.classList.add('has-unsaved-changes');
    } else {
      // Reverted to original
      pendingChanges.delete('link:' + key);
      linkEl.classList.remove('has-unsaved-changes');
    }

    updateSaveButtonVisibility();
  }

  function setLinkEditableState(enabled) {
    const links = document.querySelectorAll(EDITABLE_LINK_SELECTOR);

    links.forEach(link => {
      if (enabled && canEdit) {
        // Store original value on first encounter
        const key = link.getAttribute('data-editable-link');
        if (!originalLinkValues.has(key)) {
          originalLinkValues.set(key, {
            text: link.textContent,
            href: link.getAttribute('href') || ''
          });
        }

        // Add click handler to show editor (prevent default navigation)
        if (!link._linkEditorHandler) {
          link._linkEditorHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showLinkEditor(link);
          };
          link.addEventListener('click', link._linkEditorHandler);
        }
      } else {
        // Remove click handler
        if (link._linkEditorHandler) {
          link.removeEventListener('click', link._linkEditorHandler);
          delete link._linkEditorHandler;
        }
        link.classList.remove('editing');
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LOAD & APPLY SAVED EDITS
  // ──────────────────────────────────────────────────────────────────────────

  async function loadAndApplyEdits() {
    try {
      const session = await supabaseClient.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) {
        // Not logged in - still try to load edits for public view (will fail gracefully)
        return;
      }

      const response = await fetch(`${API_BASE}/content-edits?client_slug=${encodeURIComponent(clientSlug)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.warn('content-editor: Failed to load edits', response.status);
        return;
      }

      const data = await response.json();
      const edits = data.edits || [];

      // Apply each edit to the DOM
      let textEdits = 0;
      let linkEdits = 0;

      edits.forEach(edit => {
        // Check if this is a link edit (prefixed with "link:")
        if (edit.content_key.startsWith('link:')) {
          const linkKey = edit.content_key.substring(5); // Remove "link:" prefix
          const linkEl = document.querySelector(`[data-editable-link="${linkKey}"]`);
          if (linkEl) {
            try {
              const linkData = JSON.parse(edit.edited_value);
              linkEl.textContent = linkData.text;
              linkEl.setAttribute('href', linkData.href);
              // Store this as the "current" value
              originalLinkValues.set(linkKey, linkData);
              linkEdits++;
            } catch (e) {
              console.warn('content-editor: Failed to parse link edit', edit.content_key, e);
            }
          }
        } else {
          // Regular text edit
          const element = document.querySelector(`[data-editable-key="${edit.content_key}"]`);
          if (element) {
            element.textContent = edit.edited_value;
            // Store this as the "current" value so we don't mark it as changed
            originalValues.set(edit.content_key, edit.edited_value);
            textEdits++;
          }
        }
      });

      console.log(`content-editor: Applied ${textEdits} text edits, ${linkEdits} link edits`);
    } catch (err) {
      console.error('content-editor: Error loading edits', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EDIT MODE MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  function setEditableState(enabled) {
    const elements = document.querySelectorAll(EDITABLE_SELECTOR);

    elements.forEach(el => {
      if (enabled && canEdit) {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'true');

        // Store original value on first encounter
        const key = el.getAttribute('data-editable-key');
        if (!originalValues.has(key)) {
          originalValues.set(key, el.textContent);
        }

        // Add input listener
        if (!el._contentEditorListener) {
          el._contentEditorListener = () => handleInput(el);
          el.addEventListener('input', el._contentEditorListener);
          el.addEventListener('blur', el._contentEditorListener);
        }
      } else {
        el.removeAttribute('contenteditable');
        el.removeAttribute('spellcheck');
      }
    });
  }

  function handleInput(el) {
    const key = el.getAttribute('data-editable-key');
    const currentValue = el.textContent;
    const originalValue = originalValues.get(key) || '';

    if (currentValue !== originalValue) {
      // Mark as changed
      pendingChanges.set(key, {
        editedValue: currentValue,
        originalValue: originalValue
      });
      el.classList.add('has-unsaved-changes');
    } else {
      // Reverted to original
      pendingChanges.delete(key);
      el.classList.remove('has-unsaved-changes');
    }

    updateSaveButtonVisibility();
  }

  function updateSaveButtonVisibility() {
    const saveBtn = document.getElementById('content-edit-save-btn');
    if (!saveBtn) return;

    if (pendingChanges.size > 0 && canEdit) {
      saveBtn.style.display = 'flex';
    } else {
      saveBtn.style.display = 'none';
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SAVE CHANGES
  // ──────────────────────────────────────────────────────────────────────────

  async function saveChanges() {
    if (pendingChanges.size === 0) return;

    const saveBtn = document.getElementById('content-edit-save-btn');
    if (saveBtn) {
      saveBtn.classList.add('saving');
      saveBtn.querySelector('.save-text').textContent = 'Saving';
    }

    try {
      const session = await supabaseClient.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) {
        showToast('Not authenticated', 'error');
        return;
      }

      // Build edits array
      const edits = [];
      pendingChanges.forEach((value, contentKey) => {
        edits.push({
          contentKey,
          editedValue: value.editedValue,
          originalValue: value.originalValue
        });
      });

      const response = await fetch(`${API_BASE}/content-edits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientSlug,
          edits
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast(`${edits.length} change${edits.length > 1 ? 's' : ''} saved`);

        // Update original values to reflect saved state
        pendingChanges.forEach((value, key) => {
          if (key.startsWith('link:')) {
            // Link edit - update originalLinkValues
            const linkKey = key.substring(5);
            try {
              originalLinkValues.set(linkKey, JSON.parse(value.editedValue));
            } catch (e) { /* ignore parse errors */ }
            const linkEl = document.querySelector(`[data-editable-link="${linkKey}"]`);
            if (linkEl) linkEl.classList.remove('has-unsaved-changes');
          } else {
            // Text edit
            originalValues.set(key, value.editedValue);
            const el = document.querySelector(`[data-editable-key="${key}"]`);
            if (el) el.classList.remove('has-unsaved-changes');
          }
        });
        pendingChanges.clear();
        updateSaveButtonVisibility();
      } else {
        showToast(data.error || 'Save failed', 'error');
      }
    } catch (err) {
      console.error('content-editor: Save error', err);
      showToast('Save failed: ' + err.message, 'error');
    } finally {
      if (saveBtn) {
        saveBtn.classList.remove('saving');
        saveBtn.querySelector('.save-text').textContent = 'Save Changes';
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────────────────────────────────────

  // Inject styles
  injectStyles();

  // Create save button (hidden initially)
  createSaveButton();

  // Load and apply saved edits (for all users)
  await loadAndApplyEdits();

  // Wait for auth to resolve
  if (window.__authReady) {
    const authResult = await window.__authReady;
    userRole = authResult?.role;
    canEdit = ['admin', 'psm', 'coach'].includes(userRole);

    // Set initial editable state based on current readonly mode
    const isReadonly = document.body.getAttribute('data-readonly') === 'true';
    if (!isReadonly && canEdit) {
      setEditableState(true);
      setLinkEditableState(true);
    }
  }

  // Listen for edit mode toggle from auth.js
  window.addEventListener('readonlyModeChanged', (e) => {
    const readonly = e.detail.readonly;
    setEditableState(!readonly);
    setLinkEditableState(!readonly);
    // Close any open link popover when switching modes
    if (readonly) closeLinkPopover();
  });

  // Warn before leaving with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (pendingChanges.size > 0) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    }
  });

  // Listen for dynamically rendered content (e.g., assessments)
  // This allows content-editor to apply edits after dynamic content is rendered
  window.addEventListener('contentRendered', async () => {
    console.log('content-editor: Content rendered event received, re-applying edits');
    await loadAndApplyEdits();

    // Re-setup editable state if edit mode is on
    const isReadonly = document.body.getAttribute('data-readonly') === 'true';
    if (!isReadonly && canEdit) {
      setEditableState(true);
      setLinkEditableState(true);
    }
  });

  console.log('content-editor: Initialized', { clientSlug, canEdit, userRole });

})();
