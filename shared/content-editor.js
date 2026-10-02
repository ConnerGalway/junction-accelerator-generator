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
    `;
    document.head.appendChild(style);
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
      edits.forEach(edit => {
        const element = document.querySelector(`[data-editable-key="${edit.content_key}"]`);
        if (element) {
          element.textContent = edit.edited_value;
          // Store this as the "current" value so we don't mark it as changed
          originalValues.set(edit.content_key, edit.edited_value);
        }
      });

      console.log(`content-editor: Applied ${edits.length} saved edits`);
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
          originalValues.set(key, value.editedValue);
          const el = document.querySelector(`[data-editable-key="${key}"]`);
          if (el) el.classList.remove('has-unsaved-changes');
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
    }
  }

  // Listen for edit mode toggle from auth.js
  window.addEventListener('readonlyModeChanged', (e) => {
    const readonly = e.detail.readonly;
    setEditableState(!readonly);
  });

  // Warn before leaving with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (pendingChanges.size > 0) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    }
  });

  console.log('content-editor: Initialized', { clientSlug, canEdit, userRole });

})();
