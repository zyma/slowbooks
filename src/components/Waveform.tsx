import { WAVE_WIDTH, wavePath } from "@/lib/waveform";

/** The shape of a voice recording. Color comes from `currentColor`. */
export function Waveform({
  peaks,
  className = "",
  style,
}: {
  peaks: number[];
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox={`0 0 ${WAVE_WIDTH} 100`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`block w-full ${className}`}
      style={style}
    >
      <path d={wavePath(peaks)} fill="currentColor" />
    </svg>
  );
}
