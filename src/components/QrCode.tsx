import { encode } from "uqr";

/** A QR code as a crisp SVG in the current text color. Renders on the server, ships no script. */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { data, size } = encode(value, { ecc: "M", border: 0 });
  let d = "";
  data.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) d += `M${x} ${y}h1v1h-1z`;
    }),
  );
  return (
    <svg viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label={label} className={className}>
      <path d={d} fill="currentColor" />
    </svg>
  );
}
