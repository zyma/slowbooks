/** A QR-like mark for sample pages. Real books print a QR code to the recording. Color comes from `currentColor`. */
export function QrMark({ seed = 7, className = "" }: { seed?: number; className?: string }) {
  const size = 25;
  let s = seed;
  const random = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const finder = (x: number, y: number, fx: number, fy: number) => {
    const dx = x - fx;
    const dy = y - fy;
    if (dx < -1 || dy < -1 || dx > 7 || dy > 7) return null;
    if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return false;
    return Math.max(Math.abs(dx - 3), Math.abs(dy - 3)) !== 2;
  };
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = finder(x, y, 0, 0) ?? finder(x, y, size - 7, 0) ?? finder(x, y, 0, size - 7) ?? random() < 0.48;
      if (on) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" aria-hidden="true" className={className}>
      <path d={d} fill="currentColor" />
    </svg>
  );
}
