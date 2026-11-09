import { describe, expect, it } from '@jest/globals';
import { darkColors, lightColors } from './theme';

type RGB = [number, number, number];

// WCAG relative luminance; tests the design's foreground/background pairings.
function rgb(hex: string): RGB {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as RGB;
}

function composite(value: string, background: RGB): RGB {
  if (value.startsWith('#')) return rgb(value);
  const channels = value.match(/[\d.]+/g)!.map(Number);
  return channels
    .slice(0, 3)
    .map((channel, index) => channel * channels[3] + background[index] * (1 - channels[3])) as RGB;
}

function luminance(channels: RGB): number {
  const linear = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(foreground: RGB, background: RGB): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  return (values[1] + 0.05) / (values[0] + 0.05);
}

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
] as const)('%s theme contrast', (_name, palette) => {
  it('keeps readable text and placeholders legible on content surfaces', () => {
    const backgrounds = Object.fromEntries(
      ['bg', 'surface', 'surfaceHover', 'surfaceElevated', 'overlay'].map((key) => [
        key,
        rgb(palette[key as keyof typeof palette]),
      ])
    );
    for (const base of ['bg', 'surface'] as const) {
      for (const tint of ['accentTint', 'accentTintSoft'] as const) {
        backgrounds[`${tint} on ${base}`] = composite(palette[tint], rgb(palette[base]));
      }
    }
    const failures = [];
    for (const foreground of [
      'text',
      'textSecondary',
      'textMuted',
      'textDim',
      'textFaint',
      'accent',
    ] as const) {
      for (const [background, color] of Object.entries(backgrounds)) {
        const ratio = contrast(rgb(palette[foreground]), color);
        if (!Number.isFinite(ratio) || ratio < 4.5)
          failures.push({ foreground, background, ratio });
      }
    }
    expect(failures).toEqual([]);
  });

  it('keeps normal-size primary button labels legible', () => {
    expect(contrast(rgb(palette.white), rgb(palette.accentDark))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps primary button labels legible while pressed', () => {
    expect(contrast(rgb(palette.white), rgb(palette.accentPressed))).toBeGreaterThanOrEqual(4.5);
  });
});
