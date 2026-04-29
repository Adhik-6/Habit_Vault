// ─────────────────────────────────────────────────────────────────────────────
// Runtime design tokens — used in StyleSheet.create() and programmatic styles.
// Mirrors tailwindTokens.js so both are always in sync.
// ─────────────────────────────────────────────────────────────────────────────

// ── Colors ───────────────────────────────────────────────────────────────────

export const Colors = {
  // Backgrounds
  background: '#080B12',
  surface: '#0F1420',
  surfaceElevated: '#161C2E',
  surfaceOverlay: '#1A2236',

  // Borders
  border: '#1E2640',
  borderLight: '#242E4C',

  // Primary accent (indigo)
  accent: '#6366F1',
  accentGlow: '#818CF8',
  accentDim: '#3730A3',
  accentMuted: '#1E1B4B',

  // Semantic
  success: '#22C55E',
  successDim: '#14532D',
  warning: '#F59E0B',
  warningDim: '#78350F',
  danger: '#EF4444',
  dangerDim: '#7F1D1D',
  info: '#38BDF8',
  infoDim: '#0C4A6E',

  // Text
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDim: '#334155',

  // Heatmap tiers
  intensity: [
    'transparent',   // 0 — no data
    '#1E1B4B',       // 1 — 1-25%
    '#3730A3',       // 2 — 26-50%
    '#4F46E5',       // 3 — 51-75%
    '#6366F1',       // 4 — 76-100%
  ] as const,

  // Mood scale (index = score-1)
  mood: [
    '#EF4444', // 1
    '#F97316', // 2
    '#F59E0B', // 3
    '#EAB308', // 4
    '#84CC16', // 5
    '#22C55E', // 6
    '#10B981', // 7
    '#06B6D4', // 8
    '#6366F1', // 9
    '#A855F7', // 10
  ] as const,

  // Habit category palette
  category: [
    '#6366F1', '#EC4899', '#F59E0B', '#10B981',
    '#38BDF8', '#A855F7', '#EF4444', '#84CC16',
    '#F97316', '#06B6D4',
  ] as const,
} as const;

export type ColorKey = keyof typeof Colors;

/** Returns the mood colour for a 1-10 score. */
export function moodColor(score: number): string {
  return Colors.mood[Math.max(0, Math.min(9, score - 1))];
}

/** Returns one of 10 category colours for a given index. */
export function categoryColor(index: number): string {
  return Colors.category[index % Colors.category.length];
}

/** Returns the heatmap intensity colour for a 0-4 tier. */
export function intensityColor(tier: 0 | 1 | 2 | 3 | 4): string {
  return Colors.intensity[tier];
}

// ── Typography ────────────────────────────────────────────────────────────────

export const Typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },

  size: {
    '2xs': 10,
    xs: 12,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 34,
    '5xl': 42,
  },

  lineHeight: {
    '2xs': 14,
    xs: 16,
    sm: 18,
    base: 22,
    md: 24,
    lg: 28,
    xl: 30,
    '2xl': 32,
    '3xl': 36,
    '4xl': 42,
    '5xl': 50,
  },
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────────

export const Spacing = {
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ── Border radius ─────────────────────────────────────────────────────────────

export const Radius = {
  none: 0,
  sm: 4,
  DEFAULT: 8,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// ── Shadows ───────────────────────────────────────────────────────────────────

export const Shadows = {
  sm: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  danger: {
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// ── Animation durations ───────────────────────────────────────────────────────

export const Duration = {
  fast: 150,
  normal: 250,
  slow: 400,
  xslow: 600,
} as const;

// ── Z-index ───────────────────────────────────────────────────────────────────

export const ZIndex = {
  base: 0,
  card: 10,
  fab: 50,
  modal: 100,
  toast: 200,
  tooltip: 300,
} as const;
