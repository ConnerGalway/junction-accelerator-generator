/**
 * User Menu Component
 * Adds a hamburger menu with user options to any page
 *
 * Usage: Include this script after supabase-client.js and auth.js
 * The menu will be automatically injected into elements with class 'user-menu-container'
 * Or call initUserMenu(containerSelector) manually
 */

(function() {
  // ══════════════════════════════════════════════════════════════
  // STYLES
  // ══════════════════════════════════════════════════════════════
  const menuStyles = `
    .user-menu {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .user-menu__trigger {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1.5px solid rgba(255,255,255,0.25);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      color: rgba(255,255,255,0.8);
    }

    .user-menu__trigger:hover {
      background: rgba(255,255,255,0.1);
      border-color: rgba(255,255,255,0.4);
      color: #fff;
    }

    .user-menu__trigger svg {
      width: 20px;
      height: 20px;
    }

    .user-menu__dropdown {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 0;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(17,21,75,0.2);
      min-width: 220px;
      padding: 8px 0;
      opacity: 0;
      visibility: hidden;
      transform: translateY(8px);
      transition: all 0.2s ease;
      z-index: 1000;
    }

    /* Opens downward (for top-positioned menus like topbar) */
    .user-menu--down .user-menu__dropdown {
      bottom: auto;
      top: calc(100% + 8px);
      right: 0;
      left: auto;
      transform: translateY(-8px);
    }

    .user-menu.open .user-menu__dropdown {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .user-menu__header {
      padding: 12px 16px 12px;
      border-bottom: 1px solid rgba(17,21,75,0.08);
      margin-bottom: 4px;
    }

    .user-menu__email {
      font-size: 13px;
      font-weight: 600;
      color: #11154b;
      word-break: break-all;
    }

    .user-menu__role {
      font-size: 11px;
      color: #6b6b8a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }

    .user-menu__item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 16px;
      background: none;
      border: none;
      font-family: 'Open Sans', sans-serif;
      font-size: 14px;
      color: #1a1a2e;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s;
      text-decoration: none;
    }

    .user-menu__item:hover {
      background: rgba(17,21,75,0.04);
    }

    .user-menu__item svg {
      width: 18px;
      height: 18px;
      color: #6b6b8a;
      flex-shrink: 0;
    }

    .user-menu__item--danger {
      color: #b03030;
    }

    .user-menu__item--danger svg {
      color: #b03030;
    }

    .user-menu__divider {
      height: 1px;
      background: rgba(17,21,75,0.08);
      margin: 4px 0;
    }

    /* Backdrop for mobile */
    .user-menu__backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(17,21,75,0.3);
      z-index: 999;
    }

    .user-menu.open .user-menu__backdrop {
      display: block;
    }

    @media (min-width: 769px) {
      .user-menu.open .user-menu__backdrop {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .user-menu__dropdown {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        border-radius: 16px 16px 0 0;
        min-width: auto;
        padding-bottom: 24px;
        transform: translateY(100%);
      }

      .user-menu.open .user-menu__dropdown {
        transform: translateY(0);
      }

      .user-menu__header {
        padding: 20px 20px 16px;
      }

      .user-menu__item {
        padding: 16px 20px;
      }
    }
  `;

  // ══════════════════════════════════════════════════════════════
  // ICONS
  // ══════════════════════════════════════════════════════════════
  const ICONS = {
    menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    key: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
    logOut: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`
  };

  // ══════════════════════════════════════════════════════════════
  // INJECT STYLES
  // ══════════════════════════════════════════════════════════════
  function injectStyles() {
    if (document.getElementById('user-menu-styles')) return;
    const style = document.createElement('style');
    style.id = 'user-menu-styles';
    style.textContent = menuStyles;
    document.head.appendChild(style);
  }

  // ══════════════════════════════════════════════════════════════
  // CREATE MENU HTML
  // ══════════════════════════════════════════════════════════════
  function createMenuHTML(userEmail, userRole, direction) {
    const dirClass = direction === 'down' ? ' user-menu--down' : '';
    return `
      <div class="user-menu${dirClass}" id="userMenu">
        <div class="user-menu__backdrop" onclick="window.closeUserMenu()"></div>
        <button class="user-menu__trigger" onclick="window.toggleUserMenu()" title="Menu">
          ${ICONS.menu}
        </button>
        <div class="user-menu__dropdown">
          <div class="user-menu__header">
            <div class="user-menu__email">${userEmail}</div>
            <div class="user-menu__role">${userRole}</div>
          </div>
          <button class="user-menu__item" onclick="window.userMenuResetPassword()">
            ${ICONS.key}
            <span>Reset Password</span>
          </button>
          <button class="user-menu__item" onclick="window.userMenuUpdateProfile()">
            ${ICONS.user}
            <span>Update Profile</span>
          </button>
          <a href="mailto:brooke@elearningu.com" class="user-menu__item">
            ${ICONS.mail}
            <span>Contact Support</span>
          </a>
          <div class="user-menu__divider"></div>
          <button class="user-menu__item user-menu__item--danger" onclick="window.userMenuLogOut()">
            ${ICONS.logOut}
            <span>Log Out</span>
          </button>
        </div>
      </div>
    `;
  }

  // ══════════════════════════════════════════════════════════════
  // MENU ACTIONS
  // ══════════════════════════════════════════════════════════════
  window.toggleUserMenu = function() {
    const menu = document.getElementById('userMenu');
    if (menu) {
      menu.classList.toggle('open');
    }
  };

  window.closeUserMenu = function() {
    const menu = document.getElementById('userMenu');
    if (menu) {
      menu.classList.remove('open');
    }
  };

  window.userMenuResetPassword = async function() {
    window.closeUserMenu();

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = '/login';
      return;
    }

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(session.user.email, {
        redirectTo: 'https://accelerator.elearningu.com/auth/set-password'
      });

      if (error) throw error;

      alert('Password reset link sent! Check your email.');
    } catch (err) {
      console.error('Password reset error:', err);
      alert('Could not send password reset email. Please try again.');
    }
  };

  window.userMenuUpdateProfile = function() {
    window.closeUserMenu();
    window.location.href = '/account/profile';
  };

  window.userMenuLogOut = async function() {
    window.closeUserMenu();
    await supabaseClient.auth.signOut();
    window.location.replace('/login');
  };

  // Close menu when clicking outside
  document.addEventListener('click', function(e) {
    const menu = document.getElementById('userMenu');
    if (menu && !menu.contains(e.target)) {
      menu.classList.remove('open');
    }
  });

  // Close menu on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      window.closeUserMenu();
    }
  });

  // ══════════════════════════════════════════════════════════════
  // INIT FUNCTION
  // direction: 'up' (default) opens upward, 'down' opens downward
  // ══════════════════════════════════════════════════════════════
  window.initUserMenu = async function(containerSelector, userEmail, userRole, direction) {
    injectStyles();

    // If no user info provided, try to get from auth
    if (!userEmail && window.__authReady) {
      try {
        const user = await window.__authReady;
        userEmail = user.email;
        userRole = user.role || 'user';
      } catch (e) {
        console.error('Could not get user info for menu:', e);
        return;
      }
    }

    const container = document.querySelector(containerSelector);
    if (container) {
      container.innerHTML = createMenuHTML(userEmail, userRole, direction);
    }
  };

  // Auto-init if container exists
  document.addEventListener('DOMContentLoaded', function() {
    const autoContainer = document.querySelector('.user-menu-container');
    if (autoContainer && window.__authReady) {
      window.__authReady.then(user => {
        injectStyles();
        autoContainer.innerHTML = createMenuHTML(user.email, user.role || 'user');
      });
    }
  });
})();
