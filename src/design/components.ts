import { StyleSheet, Platform } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from './tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Reusable StyleSheet presets for the cinematic dark design system.
// Use these directly in components via StyleSheet.create or spread.
// ─────────────────────────────────────────────────────────────────────────────

// ── Screen / Layout ───────────────────────────────────────────────────────────

export const Layout = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: Spacing[6],
  },
  sectionHeader: {
    marginBottom: Spacing[3],
    paddingHorizontal: Spacing[1],
  },
});

// ── Cards ─────────────────────────────────────────────────────────────────────

export const Cards = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    ...Shadows.sm,
  },
  elevated: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing[4],
    ...Shadows.md,
  },
  compact: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
  },
  accentBorder: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
    padding: Spacing[4],
    ...Shadows.glow,
  },
});

// ── Buttons ───────────────────────────────────────────────────────────────────

export const Buttons = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    gap: Spacing[2],
  },
  primary: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[6],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    ...Shadows.glow,
  },
  secondary: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[6],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  ghost: {
    backgroundColor: 'transparent',
    borderRadius: Radius.lg,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  danger: {
    backgroundColor: Colors.danger,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[6],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    ...Shadows.danger,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fab: {
    position: 'absolute',
    right: Spacing[5],
    bottom: Spacing[8],
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow,
  },
});

// ── Typography ────────────────────────────────────────────────────────────────

export const Text = StyleSheet.create({
  // Display
  display: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['4xl'],
    lineHeight: Typography.lineHeight['4xl'],
    color: Colors.text,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['3xl'],
    lineHeight: Typography.lineHeight['3xl'],
    color: Colors.text,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size['2xl'],
    lineHeight: Typography.lineHeight['2xl'],
    color: Colors.text,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.xl,
    lineHeight: Typography.lineHeight.xl,
    color: Colors.text,
  },
  // Body
  body: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    lineHeight: Typography.lineHeight.base,
    color: Colors.text,
  },
  bodyMedium: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.base,
    lineHeight: Typography.lineHeight.base,
    color: Colors.text,
  },
  sm: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    lineHeight: Typography.lineHeight.sm,
    color: Colors.textSecondary,
  },
  smMedium: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    lineHeight: Typography.lineHeight.sm,
    color: Colors.textSecondary,
  },
  xs: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.xs,
    lineHeight: Typography.lineHeight.xs,
    color: Colors.textMuted,
  },
  // Semantic
  label: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    lineHeight: Typography.lineHeight.sm,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  caption: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.xs,
    lineHeight: Typography.lineHeight.xs,
    color: Colors.textMuted,
  },
  accent: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    lineHeight: Typography.lineHeight.base,
    color: Colors.accent,
  },
  // Score / metric display
  score: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['4xl'],
    lineHeight: Typography.lineHeight['4xl'],
    color: Colors.text,
    letterSpacing: -1,
  },
  scoreSm: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['2xl'],
    lineHeight: Typography.lineHeight['2xl'],
    color: Colors.text,
    letterSpacing: -0.5,
  },
});

// ── Inputs ────────────────────────────────────────────────────────────────────

export const Inputs = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.text,
  },
  focused: {
    borderColor: Colors.accent,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

// ── Badges ────────────────────────────────────────────────────────────────────

export const Badges = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    gap: Spacing[1],
  },
  accent: {
    backgroundColor: Colors.accentMuted,
    borderWidth: 1,
    borderColor: Colors.accentDim,
  },
  success: {
    backgroundColor: Colors.successDim,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  warning: {
    backgroundColor: Colors.warningDim,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  danger: {
    backgroundColor: Colors.dangerDim,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
});

// ── Dividers ──────────────────────────────────────────────────────────────────

export const Divider = StyleSheet.create({
  horizontal: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing[3],
  },
  vertical: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing[3],
  },
});

// ── Bottom sheet / modal ──────────────────────────────────────────────────────

export const Sheet = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  container: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: Radius['3xl'],
    borderTopRightRadius: Radius['3xl'],
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingTop: Spacing[3],
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[8],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing[4],
  },
});

// ── Progress bars ─────────────────────────────────────────────────────────────

export const Progress = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
  },
  trackSm: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fillSm: {
    height: 4,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
  },
});
