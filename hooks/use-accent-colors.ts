/**
 * useAccentColors — Derives the full accent palette from the user's chosen accent
 * color stored in useSettingsStore.
 *
 * Returns an object with the same shape as the accent-related fields in Colors
 * (accent, accentGlow, accentDim, accentMuted) plus heatmap tier colors that
 * are derived from the accent hue.
 *
 * Usage:
 *   const ac = useAccentColors();
 *   <View style={{ backgroundColor: ac.accent }} />
 */
import { useSettingsStore } from '@store/useSettingsStore';
import { useMemo } from 'react';

/** Clamp a 0-255 integer to [0, 255]. */
function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/**
 * Parse a 6-digit hex string (with or without #) and return [r, g, b] in 0-255.
 * Falls back to indigo on parse error.
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [99, 102, 241]; // indigo fallback
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return [99, 102, 241];
  return [r, g, b];
}

/** Convert 0-255 r/g/b to a `#RRGGBB` hex string. */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

/**
 * Derive a lightened version of a color by linearly interpolating each channel
 * towards 255 by `factor` (0 = original, 1 = white).
 */
function lighten(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor,
  );
}

/**
 * Derive a darkened version of a color by scaling each channel towards 0
 * by `factor` (0 = original, 1 = black).
 */
function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor));
}

export interface AccentPalette {
  /** Primary accent — solid, full-saturation color. */
  accent: string;
  /** Slightly lighter/brighter variant used for glows and icon tints. */
  accentGlow: string;
  /** Darker, less-saturated variant used for borders on selected items. */
  accentDim: string;
  /** Very dark, nearly-background tint used for selected-item backgrounds. */
  accentMuted: string;
  /**
   * 5-element heatmap tier array (index 0 = empty/transparent,
   * indices 1-4 = ascending intensity derived from the accent hue).
   */
  heatmapTiers: [string, string, string, string, string];
}

export function useAccentColors(): AccentPalette {
  const accentColor = useSettingsStore((s) => s.accentColor);

  return useMemo<AccentPalette>(() => {
    const accent = accentColor;

    // Glow: a touch lighter than the base accent
    const accentGlow = lighten(accent, 0.12);

    // Dim: a noticeably darker version (used for borders/selection rings)
    const accentDim = darken(accent, 0.32);

    // Muted: very dark variant for selected-chip backgrounds
    const accentMuted = darken(accent, 0.70);

    // Heatmap: 4 tiers from very-dark (tier 1) to full accent (tier 4)
    const tier1 = darken(accent, 0.72); // ~10% opacity feel
    const tier2 = darken(accent, 0.42); // ~40%
    const tier3 = darken(accent, 0.16); // ~75%
    const tier4 = accent;              // 100%

    return {
      accent,
      accentGlow,
      accentDim,
      accentMuted,
      heatmapTiers: ['transparent', tier1, tier2, tier3, tier4],
    };
  }, [accentColor]);
}
