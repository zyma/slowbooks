/** Width of the waveform viewBox. Height is always 100; SVGs stretch it with preserveAspectRatio="none". */
export const WAVE_WIDTH = 420;

/** Peaks we store per recording. */
export const WAVE_POINTS = 96;

/** Mirrored, filled waveform path for a viewBox of WAVE_WIDTH x 100. Peaks are 0..1. */
export function wavePath(peaks: number[], width = WAVE_WIDTH) {
  const n = peaks.length;
  if (n < 2) return "";
  const smooth = peaks.map((v, i) => {
    const prev = peaks[i - 1] ?? v;
    const next = peaks[i + 1] ?? v;
    return Math.max(0.03, Math.min(1, (prev + 2 * v + next) / 4));
  });
  smooth[0] = 0.03;
  smooth[n - 1] = 0.03;
  const step = width / (n - 1);
  const top: string[] = [];
  const bottom: string[] = [];
  smooth.forEach((v, i) => {
    const x = (i * step).toFixed(1);
    top.push(`${x} ${(50 - v * 48).toFixed(1)}`);
    bottom.unshift(`${x} ${(50 + v * 48).toFixed(1)}`);
  });
  return `M${top.join(" L")} L${bottom.join(" L")} Z`;
}

/** Shrinks a list of loudness levels to `count` peaks (max of each bucket), scaled to 0..1. */
export function toPeaks(levels: number[], count = WAVE_POINTS) {
  if (levels.length === 0) return [];
  const buckets: number[] = [];
  for (let i = 0; i < count; i++) {
    const from = Math.floor((i * levels.length) / count);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / count));
    buckets.push(Math.max(...levels.slice(from, to)));
  }
  const top = Math.max(...buckets) || 1;
  return buckets.map((v) => Math.round((v / top) * 1000) / 1000);
}

/** Speech-like peaks from a seed, for the landing page sample (it has no real recording yet). */
export function samplePeaks(seed: number, count = WAVE_POINTS) {
  let s = seed >>> 0;
  const random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const peaks: number[] = [];
  let pause = 0;
  for (let i = 0; i < count; i++) {
    if (pause > 0) {
      peaks.push(0.04 + random() * 0.05);
      pause--;
      continue;
    }
    if (i > 2 && random() < 0.08) pause = 1 + Math.floor(random() * 3);
    peaks.push(0.2 + random() * 0.8);
  }
  return peaks;
}

export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
