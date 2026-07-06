// share-modal.js
// Provides share dashboard functionality for client project pages
// Injects modal HTML/CSS and handles form submission

(function() {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════════
  // INJECT STYLES
  // ══════════════════════════════════════════════════════════════════════════

  const styles = `
    /* Share button */
    .share-btn {
      display: none; /* Hidden by default, shown via JS for clients */
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: var(--mint);
      color: var(--navy);
      border: none;
      border-radius: 8px;
      font-family: 'Open Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      margin-top: 16px;
    }
    .share-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(17,21,75,0.15);
    }
    .share-btn svg {
      width: 16px;
      height: 16px;
    }

    /* Share modal overlay */
    .share-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(17,21,75,0.6);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
    }
    .share-modal-overlay.active {
      opacity: 1;
      visibility: visible;
    }

    /* Share modal */
    .share-modal {
      background: #fff;
      border-radius: 16px;
      padding: 32px;
      width: 400px;
      max-width: calc(100vw - 32px);
      position: relative;
      transform: scale(0.95);
      transition: transform 0.2s;
    }
    .share-modal-overlay.active .share-modal {
      transform: scale(1);
    }

    .share-modal__close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 32px;
      height: 32px;
      border: none;
      background: var(--cream, #fcf5ec);
      border-radius: 8px;
      font-size: 20px;
      cursor: pointer;
      color: var(--muted, #6b6b8a);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .share-modal__close:hover {
      background: var(--cream-mid, #f5ede0);
    }

    .share-modal__title {
      font-family: 'Raleway', sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: var(--navy, #11154b);
      margin: 0 0 8px;
    }

    .share-modal__desc {
      font-size: 14px;
      color: var(--muted, #6b6b8a);
      margin: 0 0 24px;
      line-height: 1.5;
    }

    .share-modal__input {
      width: 100%;
      height: 48px;
      padding: 0 16px;
      border: 1.5px solid var(--border, rgba(17,21,75,0.1));
      border-radius: 10px;
      font-size: 15px;
      font-family: 'Open Sans', sans-serif;
      margin-bottom: 16px;
      box-sizing: border-box;
    }
    .share-modal__input:focus {
      outline: none;
      border-color: var(--navy, #11154b);
    }
    .share-modal__input::placeholder {
      color: var(--muted, #6b6b8a);
    }

    .share-modal__btn {
      width: 100%;
      height: 48px;
      background: var(--navy, #11154b);
      color: var(--mint, #aadab6);
      border: none;
      border-radius: 10px;
      font-family: 'Raleway', sans-serif;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
      position: relative;
    }
    .share-modal__btn:hover:not(:disabled) {
      background: var(--navy-mid, #1d2260);
    }
    .share-modal__btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .share-modal__btn.loading {
      color: transparent;
    }
    .share-modal__btn.loading::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      top: 50%;
      left: 50%;
      margin: -10px 0 0 -10px;
      border: 2px solid var(--mint, #aadab6);
      border-top-color: transparent;
      border-radius: 50%;
      animation: shareSpinner 0.8s linear infinite;
    }
    @keyframes shareSpinner {
      to { transform: rotate(360deg); }
    }

    .share-modal__message {
      margin-top: 16px;
      font-size: 14px;
      text-align: center;
      min-height: 20px;
    }
    .share-modal__message.success {
      color: #2d6a3e;
    }
    .share-modal__message.error {
      color: #b03030;
    }

    @media (max-width: 480px) {
      .share-modal {
        padding: 24px;
      }
      .share-btn span {
        display: none;
      }
      .share-btn {
        padding: 10px 12px;
      }
    }
  `;

  // Inject styles into head
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // ══════════════════════════════════════════════════════════════════════════
  // INJECT MODAL HTML
  // ══════════════════════════════════════════════════════════════════════════

  const modalHtml = `
    <div class="share-modal-overlay" id="shareModalOverlay">
      <div class="share-modal">
        <button type="button" class="share-modal__close" onclick="window.closeShareModal()" aria-label="Close">&times;</button>
        <h2 class="share-modal__title">Share Dashboard Access</h2>
        <p class="share-modal__desc">Invite a team member to view this accelerator dashboard. They'll receive an email with a link to access it.</p>
        <form id="shareForm">
          <input type="email" class="share-modal__input" id="shareEmail" placeholder="colleague@company.com" required autocomplete="email">
          <button type="submit" class="share-modal__btn" id="shareBtn">Send Invitation</button>
        </form>
        <p class="share-modal__message" id="shareMessage"></p>
      </div>
    </div>
  `;

  // Inject modal into body
  document.addEventListener('DOMContentLoaded', function() {
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Attach form handler
    const form = document.getElementById('shareForm');
    if (form) {
      form.addEventListener('submit', handleShareSubmit);
    }

    // Close on overlay click
    const overlay = document.getElementById('shareModalOverlay');
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          window.closeShareModal();
        }
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        window.closeShareModal();
      }
    });

    // Show share button for clients (non-readonly users)
    setTimeout(initShareButton, 100);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // INIT SHARE BUTTON
  // ══════════════════════════════════════════════════════════════════════════

  function initShareButton() {
    // Only show for clients (not read-only viewers like coaches, PSM, admin)
    if (document.body.hasAttribute('data-readonly')) {
      return;
    }

    const shareBtn = document.querySelector('.share-btn');
    if (shareBtn) {
      shareBtn.style.display = 'inline-flex';
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODAL FUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════

  window.openShareModal = function() {
    const overlay = document.getElementById('shareModalOverlay');
    if (overlay) {
      overlay.classList.add('active');
      document.getElementById('shareEmail')?.focus();
    }
  };

  window.closeShareModal = function() {
    const overlay = document.getElementById('shareModalOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      // Reset form
      document.getElementById('shareForm')?.reset();
      const msg = document.getElementById('shareMessage');
      if (msg) {
        msg.textContent = '';
        msg.className = 'share-modal__message';
      }
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // FORM SUBMISSION
  // ══════════════════════════════════════════════════════════════════════════

  async function handleShareSubmit(e) {
    e.preventDefault();

    const emailInput = document.getElementById('shareEmail');
    const submitBtn = document.getElementById('shareBtn');
    const messageEl = document.getElementById('shareMessage');

    const email = emailInput.value.trim();
    if (!email) return;

    // Get client info from page
    const clientSlug = document.body.getAttribute('data-client-slug');
    const clientNameEl = document.querySelector('h1');
    const clientName = clientNameEl?.textContent?.trim() || clientSlug;

    if (!clientSlug) {
      showMessage('error', 'Could not determine project. Please refresh and try again.');
      return;
    }

    // Get current user email
    let inviterEmail = 'unknown';
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        showMessage('error', 'Please log in to share access.');
        return;
      }
      inviterEmail = session.user.email;
    } catch (err) {
      showMessage('error', 'Authentication error. Please refresh and try again.');
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    messageEl.textContent = '';
    messageEl.className = 'share-modal__message';

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();

      const response = await fetch('/.netlify/functions/invite-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email,
          clientSlug,
          clientName,
          inviterEmail
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation');
      }

      // Success
      showMessage('success', result.message);
      emailInput.value = '';

      // Close modal after a delay
      if (!result.alreadyExists) {
        setTimeout(() => {
          window.closeShareModal();
        }, 2000);
      }

    } catch (err) {
      showMessage('error', err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  }

  function showMessage(type, text) {
    const messageEl = document.getElementById('shareMessage');
    if (messageEl) {
      messageEl.textContent = text;
      messageEl.className = `share-modal__message ${type}`;
    }
  }

})();
