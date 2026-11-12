#!/bin/bash
# Script to add user menu to existing client pages
# Run from repository root: ./scripts/add-user-menu-to-clients.sh

set -e

CLIENTS_DIR="clients"

# CSS to add before /* ── Main Content */
CSS_BLOCK='/* Sidebar user section */
.sidebar-user {
  margin-top: auto;
  padding: 12px 20px 16px;
  border-top: 1px solid rgba(255,255,255,0.07);
}

/* Mobile user menu button */
.mobile-header .user-menu-container {
  margin-left: auto;
  margin-right: 8px;
}'

# Find all client index.html files that don't have user-menu.js
for file in $CLIENTS_DIR/*/index.html; do
  if ! grep -q "user-menu.js" "$file"; then
    echo "Updating: $file"

    # 1. Add user-menu.js script after auth.js
    sed -i '' 's|<script src="/shared/auth.js"></script>|<script src="/shared/auth.js"></script>\
<script src="/shared/user-menu.js"></script>|' "$file"

    # 2. Add CSS for sidebar-user if not present
    if ! grep -q "\.sidebar-user" "$file"; then
      sed -i '' '/\/\* ── Main Content/i\
/* Sidebar user section */\
.sidebar-user {\
  margin-top: auto;\
  padding: 12px 20px 16px;\
  border-top: 1px solid rgba(255,255,255,0.07);\
}\
\
/* Mobile user menu button */\
.mobile-header .user-menu-container {\
  margin-left: auto;\
  margin-right: 8px;\
}\
' "$file"
    fi

    # 3. Add user-menu-container to mobile header (after mobile-header-title span)
    if ! grep -q 'id="mobileUserMenu"' "$file"; then
      sed -i '' 's|<span class="mobile-header-title">[^<]*</span>|&\
  <div class="user-menu-container" id="mobileUserMenu"></div>|' "$file"
    fi

    # 4. Add user-menu-container to sidebar (before </nav></aside>)
    if ! grep -q 'id="sidebarUserMenu"' "$file"; then
      sed -i '' 's|  </nav>$|    <div class="sidebar-user">\
      <div class="user-menu-container" id="sidebarUserMenu"></div>\
    </div>\
  </nav>|' "$file"
    fi

    echo "  Done!"
  else
    echo "Skipping (already has user-menu): $file"
  fi
done

echo ""
echo "All client pages updated!"
