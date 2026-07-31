/* @ds-bundle: {"format":4,"namespace":"ELearningUDesignSystem_665fdf","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"21456100700f","components/core/Button.jsx":"3969f2488ad6","components/core/Card.jsx":"96d40f394bb3","components/core/IconButton.jsx":"dc52a0dfe8f0","components/core/Tag.jsx":"00c2562c9f34","components/feedback/Dialog.jsx":"da8fb7fd5799","components/feedback/Toast.jsx":"700e49f6c003","components/feedback/Tooltip.jsx":"cb2d96346d08","components/forms/Checkbox.jsx":"48950521a1c2","components/forms/Input.jsx":"350989e823fa","components/forms/Radio.jsx":"b4fcc04fe378","components/forms/Select.jsx":"8f1f6b6818b1","components/forms/Switch.jsx":"2c7b28a64633","components/navigation/Tabs.jsx":"62c6c9fef4b1","ui_kits/course-platform/CatalogScreen.jsx":"cfdab8f4e453","ui_kits/course-platform/CoursePlayerScreen.jsx":"048bc1ff588d","ui_kits/course-platform/DashboardScreen.jsx":"4602e762b6ae","ui_kits/course-platform/LoginScreen.jsx":"ec8a530bede3"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ELearningUDesignSystem_665fdf = window.ELearningUDesignSystem_665fdf || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function Badge({
  tone = 'neutral',
  children
}) {
  const tones = {
    neutral: {
      background: 'var(--surface-sunken)',
      color: 'var(--fg-1)'
    },
    info: {
      background: '#e3f2fa',
      color: 'var(--link-blue)'
    },
    success: {
      background: '#e6f4ea',
      color: 'var(--state-success)'
    },
    warning: {
      background: '#fbf0de',
      color: 'var(--state-warning)'
    },
    danger: {
      background: '#fbe9e7',
      color: 'var(--state-danger)'
    },
    accent: {
      background: 'var(--mint-500)',
      color: 'var(--navy-900)'
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: '12px',
      padding: '3px 10px',
      borderRadius: 'var(--radius-pill)',
      ...tones[tone]
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon = null,
  children,
  onClick
}) {
  const pad = size === 'sm' ? '8px 14px' : size === 'lg' ? '16px 28px' : '11px 20px';
  const fontSize = size === 'sm' ? '13px' : size === 'lg' ? '17px' : '15px';
  const base = {
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize,
    padding: pad,
    borderRadius: 'var(--radius-md)',
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background .15s ease, transform .05s ease',
    opacity: disabled ? 0.5 : 1
  };
  const variants = {
    primary: {
      background: 'var(--navy-900)',
      color: 'var(--white)'
    },
    secondary: {
      background: 'var(--white)',
      color: 'var(--navy-900)',
      border: '1px solid var(--border-strong)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--navy-900)'
    },
    accent: {
      background: 'var(--mint-500)',
      color: 'var(--navy-900)'
    },
    danger: {
      background: 'var(--state-danger)',
      color: 'var(--white)'
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    disabled: disabled,
    onClick: onClick,
    style: {
      ...base,
      ...variants[variant]
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'scale(0.97)';
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = 'scale(1)';
    }
  }, icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function Card({
  children,
  padding = 'md',
  style = {}
}) {
  const pad = padding === 'sm' ? '16px' : padding === 'lg' ? '32px' : '20px';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)',
      padding: pad,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function IconButton({
  icon,
  size = 'md',
  variant = 'ghost',
  onClick,
  'aria-label': ariaLabel
}) {
  const dim = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  const variants = {
    ghost: {
      background: 'transparent',
      color: 'var(--navy-900)'
    },
    solid: {
      background: 'var(--navy-900)',
      color: 'var(--white)'
    },
    outline: {
      background: 'var(--white)',
      color: 'var(--navy-900)',
      border: '1px solid var(--border-strong)'
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    "aria-label": ariaLabel,
    onClick: onClick,
    style: {
      width: dim,
      height: dim,
      borderRadius: 'var(--radius-md)',
      border: '1px solid transparent',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      ...variants[variant]
    }
  }, icon);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function Tag({
  children,
  onRemove
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontFamily: 'var(--font-body)',
      fontSize: '13px',
      color: 'var(--fg-1)',
      background: 'var(--white)',
      border: '1px solid var(--border-subtle)',
      padding: '4px 10px',
      borderRadius: 'var(--radius-pill)'
    }
  }, children, onRemove && /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    "aria-label": "Remove",
    style: {
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      color: 'var(--fg-2)',
      fontSize: '13px',
      lineHeight: 1
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  open,
  title,
  children,
  onClose,
  footer
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(17,21,75,0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: 'var(--white)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      width: '420px',
      maxWidth: '90vw',
      padding: '24px',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: '20px',
      color: 'var(--fg-1)',
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      fontSize: '18px',
      color: 'var(--fg-2)'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--fg-1)',
      fontSize: '14px',
      lineHeight: 1.6
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '20px'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function Toast({
  tone = 'info',
  message,
  onClose
}) {
  const tones = {
    info: {
      background: 'var(--white)',
      border: 'var(--link-blue)'
    },
    success: {
      background: 'var(--white)',
      border: 'var(--state-success)'
    },
    danger: {
      background: 'var(--white)',
      border: 'var(--state-danger)'
    }
  };
  const t = tones[tone];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: t.background,
      borderLeft: `4px solid ${t.border}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-md)',
      padding: '12px 16px',
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
      color: 'var(--fg-1)',
      minWidth: '260px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, message), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Dismiss",
    style: {
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      color: 'var(--fg-2)'
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function Tooltip({
  label,
  children
}) {
  const [show, setShow] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: '125%',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--navy-800)',
      color: 'var(--white)',
      fontFamily: 'var(--font-body)',
      fontSize: '12px',
      padding: '5px 9px',
      borderRadius: 'var(--radius-sm)',
      whiteSpace: 'nowrap',
      boxShadow: 'var(--shadow-md)',
      zIndex: 10
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  label,
  checked,
  onChange,
  disabled = false
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
      color: 'var(--fg-1)',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: '4px',
      border: '1px solid var(--border-strong)',
      background: checked ? 'var(--navy-900)' : 'var(--white)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--white)',
      fontSize: '11px'
    }
  }, "\u2713")), /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      display: 'none'
    }
  }), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function Input({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  error,
  disabled = false
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      fontFamily: 'var(--font-body)',
      width: '100%'
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: 'var(--fg-1)'
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    type: type,
    placeholder: placeholder,
    value: value,
    onChange: onChange,
    disabled: disabled,
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
      padding: '10px 12px',
      borderRadius: 'var(--radius-sm)',
      border: `1px solid ${error ? 'var(--state-danger)' : 'var(--border-subtle)'}`,
      background: disabled ? 'var(--surface-sunken)' : 'var(--white)',
      color: 'var(--fg-1)',
      outline: 'none'
    }
  }), error && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'var(--state-danger)'
    }
  }, error));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function Radio({
  label,
  checked,
  onChange,
  name,
  disabled = false
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
      color: 'var(--fg-1)',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: '50%',
      border: '1px solid var(--border-strong)',
      background: 'var(--white)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: 'var(--navy-900)'
    }
  })), /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: name,
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      display: 'none'
    }
  }), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function Select({
  label,
  value,
  onChange,
  options = [],
  disabled = false
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      fontFamily: 'var(--font-body)',
      width: '100%'
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: 'var(--fg-1)'
    }
  }, label), /*#__PURE__*/React.createElement("select", {
    value: value,
    onChange: onChange,
    disabled: disabled,
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
      padding: '10px 12px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-subtle)',
      background: disabled ? 'var(--surface-sunken)' : 'var(--white)',
      color: 'var(--fg-1)'
    }
  }, options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked,
  onChange,
  disabled = false,
  label
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
      color: 'var(--fg-1)',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange && onChange({
      target: {
        checked: !checked
      }
    }),
    style: {
      width: 40,
      height: 22,
      borderRadius: 'var(--radius-pill)',
      background: checked ? 'var(--navy-900)' : 'var(--border-subtle)',
      position: 'relative',
      transition: 'background .15s ease',
      opacity: disabled ? 0.5 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: checked ? 20 : 2,
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: 'var(--white)',
      boxShadow: 'var(--shadow-sm)',
      transition: 'left .15s ease'
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  tabs = [],
  active,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '4px',
      borderBottom: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-body)'
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.value,
    onClick: () => onChange && onChange(t.value),
    style: {
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: 600,
      color: active === t.value ? 'var(--navy-900)' : 'var(--fg-2)',
      borderBottom: active === t.value ? '2px solid var(--navy-900)' : '2px solid transparent'
    }
  }, t.label)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/course-platform/CatalogScreen.jsx
try { (() => {
const {
  Card,
  Badge,
  Tag,
  Button,
  Select
} = window.ELearningUDesignSystem_665fdf;
const CATALOG = [{
  title: 'Sustainable Tourism 101',
  level: 'Beginner',
  hours: 4,
  tag: 'Sustainability'
}, {
  title: 'Guest Experience Excellence',
  level: 'Intermediate',
  hours: 6,
  tag: 'Hospitality Service'
}, {
  title: 'Destination Marketing Foundations',
  level: 'Beginner',
  hours: 5,
  tag: 'Destination Marketing'
}, {
  title: 'Revenue Management Essentials',
  level: 'Advanced',
  hours: 8,
  tag: 'Revenue Management'
}, {
  title: 'Accessible Travel Design',
  level: 'Intermediate',
  hours: 3,
  tag: 'Accessibility'
}, {
  title: 'Cultural Heritage Interpretation',
  level: 'Beginner',
  hours: 5,
  tag: 'Heritage'
}];
function CatalogScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      minHeight: '600px',
      background: 'var(--surface-page)',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement(window.Sidebar, {
    active: "Catalog"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: '30px',
      color: 'var(--fg-1)',
      margin: 0
    }
  }, "Course Catalog"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-2)',
      fontSize: '15px',
      marginTop: '6px'
    }
  }, "Courses built for tourism professionals.")), /*#__PURE__*/React.createElement(Select, {
    options: [{
      value: 'pop',
      label: 'Most popular'
    }, {
      value: 'new',
      label: 'Newest'
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      marginTop: '18px',
      flexWrap: 'wrap'
    }
  }, ['Sustainability', 'Hospitality Service', 'Destination Marketing', 'Revenue Management'].map(t => /*#__PURE__*/React.createElement(Tag, {
    key: t
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px',
      marginTop: '24px'
    }
  }, CATALOG.map(c => /*#__PURE__*/React.createElement(Card, {
    key: c.title
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "accent"
  }, c.level), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: '16px',
      color: 'var(--fg-1)',
      marginTop: '10px'
    }
  }, c.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '13px',
      color: 'var(--fg-2)',
      marginTop: '6px'
    }
  }, c.hours, " hours \xB7 ", c.tag), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    style: {
      marginTop: '14px',
      width: '100%',
      justifyContent: 'center'
    }
  }, "View course"))))));
}
window.CatalogScreen = CatalogScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/course-platform/CatalogScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/course-platform/CoursePlayerScreen.jsx
try { (() => {
const {
  Tabs,
  Button,
  Badge
} = window.ELearningUDesignSystem_665fdf;
const LESSONS = [{
  title: '1. Why Sustainability Matters',
  done: true
}, {
  title: '2. Measuring Your Footprint',
  done: true
}, {
  title: '3. Community-Based Tourism',
  done: false,
  active: true
}, {
  title: '4. Certifications & Standards',
  done: false
}, {
  title: '5. Final Assessment',
  done: false
}];
function CoursePlayerScreen() {
  const [active, setActive] = React.useState('overview');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      minHeight: '600px',
      background: 'var(--surface-page)',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement(window.Sidebar, {
    active: "My Courses"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '32px 40px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "info"
  }, "In progress"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: '26px',
      color: 'var(--fg-1)',
      margin: '10px 0 0'
    }
  }, "Sustainable Tourism 101"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '16px'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    tabs: [{
      value: 'overview',
      label: 'Overview'
    }, {
      value: 'lessons',
      label: 'Lessons'
    }, {
      value: 'reviews',
      label: 'Reviews'
    }],
    active: active,
    onChange: setActive
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '20px',
      height: '280px',
      background: 'var(--navy-800)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 0,
      height: 0,
      borderTop: '16px solid transparent',
      borderBottom: '16px solid transparent',
      borderLeft: '24px solid white',
      marginRight: '-6px'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '16px'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary"
  }, "Previous"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary"
  }, "Mark complete & continue"))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '300px',
      borderLeft: '1px solid var(--border-subtle)',
      padding: '24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: '15px',
      color: 'var(--fg-1)',
      marginBottom: '14px'
    }
  }, "Lessons"), LESSONS.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.title,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 8px',
      borderRadius: 'var(--radius-sm)',
      background: l.active ? 'var(--surface-sunken)' : 'transparent',
      fontSize: '13px',
      color: 'var(--fg-1)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: l.done ? 'var(--state-success)' : 'var(--white)',
      border: l.done ? 'none' : '1px solid var(--border-strong)',
      color: 'var(--white)',
      fontSize: '10px',
      flexShrink: 0
    }
  }, l.done ? '✓' : ''), l.title)))));
}
window.CoursePlayerScreen = CoursePlayerScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/course-platform/CoursePlayerScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/course-platform/DashboardScreen.jsx
try { (() => {
const {
  Card,
  Badge,
  Button
} = window.ELearningUDesignSystem_665fdf;
const COURSES = [{
  title: 'Sustainable Tourism 101',
  progress: 72,
  tone: 'info',
  status: 'In progress'
}, {
  title: 'Guest Experience Excellence',
  progress: 100,
  tone: 'success',
  status: 'Completed'
}, {
  title: 'Destination Marketing Foundations',
  progress: 12,
  tone: 'warning',
  status: 'Just started'
}];
function Sidebar({
  active
}) {
  const items = ['Dashboard', 'My Courses', 'Catalog', 'Certificates', 'Settings'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '220px',
      background: 'var(--navy-900)',
      color: 'var(--white)',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-wordmark-white.png",
    style: {
      height: '28px',
      marginBottom: '24px',
      marginLeft: '8px'
    }
  }), items.map(it => /*#__PURE__*/React.createElement("div", {
    key: it,
    style: {
      padding: '10px 12px',
      borderRadius: 'var(--radius-sm)',
      fontSize: '14px',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      background: it === active ? 'rgba(255,255,255,0.12)' : 'transparent',
      cursor: 'pointer'
    }
  }, it)));
}
function DashboardScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      minHeight: '600px',
      background: 'var(--surface-page)',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    active: "Dashboard"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '32px 40px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: '30px',
      color: 'var(--fg-1)',
      margin: 0
    }
  }, "Welcome back, Jamie"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-2)',
      fontSize: '15px',
      marginTop: '6px'
    }
  }, "You're 3 lessons away from your next certificate."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px',
      marginTop: '28px'
    }
  }, COURSES.map(c => /*#__PURE__*/React.createElement(Card, {
    key: c.title
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: c.tone
  }, c.status), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: '17px',
      color: 'var(--fg-1)',
      marginTop: '10px'
    }
  }, c.title), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '8px',
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-pill)',
      marginTop: '14px',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${c.progress}%`,
      background: 'var(--navy-900)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '12px',
      color: 'var(--fg-2)',
      marginTop: '6px'
    }
  }, c.progress, "% complete"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    style: {
      marginTop: '14px',
      width: '100%',
      justifyContent: 'center'
    }
  }, "Continue"))))));
}
window.DashboardScreen = DashboardScreen;
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/course-platform/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/course-platform/LoginScreen.jsx
try { (() => {
const {
  Button,
  Input
} = window.ELearningUDesignSystem_665fdf;
function LoginScreen({
  onLogin
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '600px',
      display: 'flex',
      background: 'var(--surface-page)',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: 'var(--navy-900)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-wordmark-white.png",
    style: {
      height: '40px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--white)',
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: '22pt',
      textAlign: 'center',
      maxWidth: '320px'
    }
  }, "Building Digital Futures")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '320px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: '28px',
      color: 'var(--fg-1)',
      margin: 0
    }
  }, "Welcome back"), /*#__PURE__*/React.createElement(Input, {
    label: "Email",
    placeholder: "you@company.com"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Password",
    type: "password",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onLogin
  }, "Sign in"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: '13px',
      textAlign: 'center'
    }
  }, "Forgot password?"))));
}
window.LoginScreen = LoginScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/course-platform/LoginScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
