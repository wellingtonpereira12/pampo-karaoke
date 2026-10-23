// Color extraction and dynamic palette harmonizer for Video Ambilight
export interface VideoPalette {
  primary: [number, number, number];    // RGB e.g. [236, 72, 153]
  secondary: [number, number, number];  // RGB e.g. [6, 182, 212]
  accent: [number, number, number];     // RGB e.g. [168, 85, 247]
  primaryHex: string;
  secondaryHex: string;
}

export const DEFAULT_PALETTE: VideoPalette = {
  primary: [236, 72, 153],   // #ec4899 Neon Pink
  secondary: [6, 182, 212],   // #06b6d4 Cyan
  accent: [168, 85, 247],    // #a855f7 Purple
  primaryHex: '#ec4899',
  secondaryHex: '#06b6d4',
};

const cache = new Map<string, VideoPalette>();

// Converts RGB values to a clean hex string
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Generates a deterministic fallback palette from a song ID or title
export function generateFallbackPalette(seed: string): VideoPalette {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 60) % 360;
  const hue3 = (hue1 + 180) % 360;

  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  };

  const p = hslToRgb(hue1, 0.85, 0.55);
  const s = hslToRgb(hue2, 0.85, 0.50);
  const a = hslToRgb(hue3, 0.85, 0.55);

  return {
    primary: p,
    secondary: s,
    accent: a,
    primaryHex: rgbToHex(p[0], p[1], p[2]),
    secondaryHex: rgbToHex(s[0], s[1], s[2]),
  };
}

/**
 * Extracts vibrant dominant colors from an image/thumbnail URL using an offscreen canvas.
 */
export async function extractPaletteFromImage(imageUrl: string, fallbackSeed: string): Promise<VideoPalette> {
  if (!imageUrl) return generateFallbackPalette(fallbackSeed);
  if (cache.has(imageUrl)) return cache.get(imageUrl)!;

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      // Timeout after 1.5s
      setTimeout(() => reject(), 1500);
    });

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');

    ctx.drawImage(img, 0, 0, 16, 16);
    const data = ctx.getImageData(0, 0, 16, 16).data;

    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    const colorBuckets: Array<{ r: number; g: number; b: number; sat: number; brightness: number }> = [];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const brightness = (r + g + b) / 3;

      // Filter out pure black letterbox bars or pure white noise
      if (brightness > 25 && brightness < 240 && sat > 0.15) {
        colorBuckets.push({ r, g, b, sat, brightness });
        rSum += r;
        gSum += g;
        bSum += b;
        count++;
      }
    }

    if (colorBuckets.length < 5) {
      const fallback = generateFallbackPalette(fallbackSeed);
      cache.set(imageUrl, fallback);
      return fallback;
    }

    // Sort by saturation to find vibrant colorful pixels
    colorBuckets.sort((a, b) => b.sat - a.sat);

    // Primary vibrant color
    const best = colorBuckets[0];
    // Secondary complementary color (furthest hue or contrasting tone)
    const second = colorBuckets.find(
      c => Math.abs(c.r - best.r) + Math.abs(c.g - best.g) + Math.abs(c.b - best.b) > 90
    ) || colorBuckets[Math.min(5, colorBuckets.length - 1)];

    // Accent color
    const third = colorBuckets[Math.floor(colorBuckets.length * 0.4)] || second;

    const boostSaturation = (c: { r: number; g: number; b: number }): [number, number, number] => {
      // Ensure color isn't too muddy or dim for the UI glow
      const factor = 1.25;
      const r = Math.min(255, Math.round(c.r * factor + 15));
      const g = Math.min(255, Math.round(c.g * factor + 15));
      const b = Math.min(255, Math.round(c.b * factor + 15));
      return [r, g, b];
    };

    const primary = boostSaturation(best);
    const secondary = boostSaturation(second);
    const accent = boostSaturation(third);

    const palette: VideoPalette = {
      primary,
      secondary,
      accent,
      primaryHex: rgbToHex(primary[0], primary[1], primary[2]),
      secondaryHex: rgbToHex(secondary[0], secondary[1], secondary[2]),
    };

    cache.set(imageUrl, palette);
    return palette;
  } catch (err) {
    const fallback = generateFallbackPalette(fallbackSeed);
    cache.set(imageUrl, fallback);
    return fallback;
  }
}
