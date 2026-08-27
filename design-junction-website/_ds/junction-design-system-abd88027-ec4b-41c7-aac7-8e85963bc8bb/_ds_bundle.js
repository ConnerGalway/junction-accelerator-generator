/* @ds-bundle: {"format":4,"namespace":"JunctionDesignSystem_abd880","components":[{"name":"ActionTag","sourcePath":"components/slides/ActionTag.jsx"},{"name":"IconBadge","sourcePath":"components/slides/IconBadge.jsx"},{"name":"PastelChip","sourcePath":"components/slides/PastelChip.jsx"},{"name":"QuoteCard","sourcePath":"components/slides/QuoteCard.jsx"},{"name":"StatCallout","sourcePath":"components/slides/StatCallout.jsx"}],"sourceHashes":{"components/slides/ActionTag.jsx":"666f3a05d8a0","components/slides/IconBadge.jsx":"95165388e9e0","components/slides/PastelChip.jsx":"18fb1a674b86","components/slides/QuoteCard.jsx":"4d7c26fb7950","components/slides/StatCallout.jsx":"683962180ce6"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.JunctionDesignSystem_abd880 = window.JunctionDesignSystem_abd880 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/slides/ActionTag.jsx
try { (() => {
function ActionTag({
  children = 'ACTION'
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--navy-900)',
      background: 'var(--gold-500)',
      borderRadius: 'var(--radius-pill)',
      padding: '5px 14px'
    }
  }, children);
}
Object.assign(__ds_scope, { ActionTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/slides/ActionTag.jsx", error: String((e && e.message) || e) }); }

// components/slides/IconBadge.jsx
try { (() => {
const bg = {
  sage: 'var(--chip-sage)',
  mint: 'var(--chip-mint)',
  peach: 'var(--chip-peach)',
  none: 'transparent'
};
function IconBadge({
  icon,
  tone = 'none',
  size = 44
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: 'var(--radius-md)',
      background: bg[tone] || bg.none,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${icon}`,
    style: {
      fontSize: size * 0.5,
      color: 'var(--navy-800)'
    }
  }));
}
Object.assign(__ds_scope, { IconBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/slides/IconBadge.jsx", error: String((e && e.message) || e) }); }

// components/slides/PastelChip.jsx
try { (() => {
const bg = {
  sage: 'var(--chip-sage)',
  mint: 'var(--chip-mint)',
  peach: 'var(--chip-peach)'
};
function PastelChip({
  tone = 'sage',
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 'var(--weight-medium)',
      color: 'var(--navy-900)',
      background: bg[tone] || bg.sage,
      borderRadius: 'var(--radius-pill)',
      padding: '6px 16px'
    }
  }, children);
}
Object.assign(__ds_scope, { PastelChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/slides/PastelChip.jsx", error: String((e && e.message) || e) }); }

// components/slides/QuoteCard.jsx
try { (() => {
function QuoteCard({
  children,
  backgroundImage
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }
  }, backgroundImage ? /*#__PURE__*/React.createElement("img", {
    src: backgroundImage,
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: 'rgba(10,10,14,0.86)',
      boxShadow: 'var(--shadow-dark-panel)',
      padding: '40px 48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-light)',
      fontSize: 26,
      lineHeight: 'var(--leading-snug)',
      color: '#fff',
      textAlign: 'center'
    }
  }, children)));
}
Object.assign(__ds_scope, { QuoteCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/slides/QuoteCard.jsx", error: String((e && e.message) || e) }); }

// components/slides/StatCallout.jsx
try { (() => {
function StatCallout({
  value,
  label,
  size = 'lg'
}) {
  const fontSize = size === 'sm' ? 40 : size === 'md' ? 64 : 88;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize,
      fontWeight: 'var(--weight-medium)',
      color: 'var(--navy-900)',
      lineHeight: 1
    }
  }, value), label ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      color: 'var(--gray-700)',
      maxWidth: 260,
      lineHeight: 'var(--leading-snug)'
    }
  }, label) : null);
}
Object.assign(__ds_scope, { StatCallout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/slides/StatCallout.jsx", error: String((e && e.message) || e) }); }

__ds_ns.ActionTag = __ds_scope.ActionTag;

__ds_ns.IconBadge = __ds_scope.IconBadge;

__ds_ns.PastelChip = __ds_scope.PastelChip;

__ds_ns.QuoteCard = __ds_scope.QuoteCard;

__ds_ns.StatCallout = __ds_scope.StatCallout;

})();
