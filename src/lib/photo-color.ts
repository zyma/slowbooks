import sharp from "sharp";
import { PALETTE_SIZE } from "./card-style";
import { getObjectBuffer } from "./storage";

/** A table under a moment: a bright tone of one of the photo's colours, and a dark accent of the same hue. */
export type PhotoColors = { table: string; accent: string };

/** Bright tones for photos with few colours (black-and-white, grey): a hue taken from them would be muddy. */
const FALLBACK_HUES = [203, 345, 43, 110, 265];

function hsl(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const hex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

function toHsl(r: number, g: number, b: number) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d > 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s, l };
}

/** A bright, light table and a dark accent for one hue. */
function fromHue(h: number, s = 0.6): PhotoColors {
  return {
    table: hsl(h, Math.min(0.75, Math.max(0.5, s)), 0.79),
    accent: hsl(h, 0.6, 0.28),
  };
}

const HUE_BINS = 18;

/**
 * Up to five table colours from the photo, the strongest first. Pixels vote for their hue,
 * weighted by saturation, so grey areas count little. Missing places are filled with bright defaults.
 */
async function computePalette(storageKey: string): Promise<PhotoColors[]> {
  const { data, info } = await sharp(await getObjectBuffer(storageKey))
    .resize(48, 48, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bins = Array.from({ length: HUE_BINS }, () => ({
    weight: 0,
    count: 0,
  }));
  for (let i = 0; i < data.length; i += info.channels) {
    const { h, s, l } = toHsl(data[i], data[i + 1], data[i + 2]);
    if (s < 0.15 || l < 0.12 || l > 0.92) continue;
    const bin = bins[Math.floor(h / (360 / HUE_BINS)) % HUE_BINS];
    bin.weight += s;
    bin.count += 1;
  }
  const total = bins.reduce((sum, b) => sum + b.weight, 0);
  const palette: PhotoColors[] = [];
  const used: number[] = [];
  bins
    .map((b, i) => ({ ...b, hue: (i + 0.5) * (360 / HUE_BINS) }))
    .filter((b) => b.weight > total * 0.04)
    .sort((a, b) => b.weight - a.weight)
    .forEach((b) => {
      // Neighbouring bins look the same as tables: keep hues at least 30 degrees apart.
      if (palette.length >= PALETTE_SIZE || used.some((u) => Math.abs(((u - b.hue + 540) % 360) - 180) < 30)) return;
      used.push(b.hue);
      palette.push(fromHue(b.hue, b.weight / b.count));
    });
  for (const hue of FALLBACK_HUES) {
    if (palette.length >= PALETTE_SIZE) break;
    if (used.some((u) => Math.abs(((u - hue + 540) % 360) - 180) < 30)) continue;
    used.push(hue);
    palette.push(fromHue(hue));
  }
  return palette;
}

// One photo never changes, so its palette is kept for the life of the server process.
const cache = new Map<string, Promise<PhotoColors[]>>();

export function photoPalette(storageKey: string): Promise<PhotoColors[]> {
  let palette = cache.get(storageKey);
  if (!palette) {
    palette = computePalette(storageKey).catch(() => {
      cache.delete(storageKey);
      return FALLBACK_HUES.map((h) => fromHue(h));
    });
    cache.set(storageKey, palette);
  }
  return palette;
}
