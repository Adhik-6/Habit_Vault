// ─────────────────────────────────────────────────────────────────────────────
// Shared design tokens exported as plain JS (CommonJS) so they can be consumed
// by both tailwind.config.js (build-time) and src/design/tokens.ts (runtime).
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  // ── Backgrounds
  background: '#080B12',       // deep space black — primary screen bg
  surface: '#0F1420',          // card / sheet bg
  'surface-elevated': '#161C2E', // modals, popovers
  'surface-overlay': '#1A2236', // overlays, hover states

  // ── Borders
  border: '#1E2640',
  'border-light': '#242E4C',

  // ── Primary accent (indigo)
  accent: '#6366F1',
  'accent-glow': '#818CF8',    // lighter for glow/hover
  'accent-dim': '#3730A3',     // pressed states
  'accent-muted': '#1E1B4B',   // very dim, backgrounds

  // ── Semantic colours
  success: '#22C55E',
  'success-dim': '#14532D',
  warning: '#F59E0B',
  'warning-dim': '#78350F',
  danger: '#EF4444',
  'danger-dim': '#7F1D1D',
  info: '#38BDF8',
  'info-dim': '#0C4A6E',

  // ── Text
  text: '#F1F5F9',             // primary text
  'text-secondary': '#94A3B8', // secondary / labels
  'text-muted': '#64748B',     // placeholders, captions
  'text-dim': '#334155',       // disabled

  // ── Heatmap intensity tiers (5 levels, 0 = empty)
  'intensity-0': 'transparent',
  'intensity-1': '#1E1B4B',    // 1-25 % completion
  'intensity-2': '#3730A3',    // 26-50 %
  'intensity-3': '#4F46E5',    // 51-75 %
  'intensity-4': '#6366F1',    // 76-100 %

  // ── Mood scale (10 tiers from red → green)
  'mood-1': '#EF4444',
  'mood-2': '#F97316',
  'mood-3': '#F59E0B',
  'mood-4': '#EAB308',
  'mood-5': '#84CC16',
  'mood-6': '#22C55E',
  'mood-7': '#10B981',
  'mood-8': '#06B6D4',
  'mood-9': '#6366F1',
  'mood-10': '#A855F7',

  // ── Habit category defaults (10 colours)
  'cat-0': '#6366F1',
  'cat-1': '#EC4899',
  'cat-2': '#F59E0B',
  'cat-3': '#10B981',
  'cat-4': '#38BDF8',
  'cat-5': '#A855F7',
  'cat-6': '#EF4444',
  'cat-7': '#84CC16',
  'cat-8': '#F97316',
  'cat-9': '#06B6D4',
};

const FONT_SIZES = {
  '2xs': ['10px', { lineHeight: '14px' }],
  xs:    ['12px', { lineHeight: '16px' }],
  sm:    ['13px', { lineHeight: '18px' }],
  base:  ['15px', { lineHeight: '22px' }],
  md:    ['16px', { lineHeight: '24px' }],
  lg:    ['18px', { lineHeight: '28px' }],
  xl:    ['20px', { lineHeight: '30px' }],
  '2xl': ['24px', { lineHeight: '32px' }],
  '3xl': ['28px', { lineHeight: '36px' }],
  '4xl': ['34px', { lineHeight: '42px' }],
  '5xl': ['42px', { lineHeight: '50px' }],
};

const SPACING = {
  px: '1px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
};

const RADIUS = {
  none: '0px',
  sm: '4px',
  DEFAULT: '8px',
  md: '10px',
  lg: '14px',
  xl: '18px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
};

module.exports = { COLORS, FONT_SIZES, SPACING, RADIUS };
