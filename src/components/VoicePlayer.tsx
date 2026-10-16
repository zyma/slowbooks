"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/waveform";
import { Waveform } from "./Waveform";

/**
 * Plays the original recording over its waveform.
 * Duration comes from our database: recordings made by MediaRecorder often report no duration.
 */
export function VoicePlayer({
  src,
  peaks,
  durationSec,
  className = "",
}: {
  src: string;
  peaks: number[];
  durationSec: number;
  className?: string;
}) {
  const t = useTranslations("Voice");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const progress = durationSec > 0 ? Math.min(1, position / durationSec) : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setPosition(audio.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setPosition(0);
    };
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("pause") : t("listen")}
        className="flex size-12 flex-none items-center justify-center rounded-full border border-ink text-ink hover:bg-surface"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          {playing ? (
            <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
          ) : (
            <path d="M8.5 5.5v13l10-6.5z" fill="currentColor" />
          )}
        </svg>
      </button>
      <div className="relative h-10 min-w-0 flex-1">
        <Waveform peaks={peaks} className="absolute inset-0 h-full text-wave-light" />
        <Waveform
          peaks={peaks}
          className="absolute inset-0 h-full text-ink"
          style={{ clipPath: `inset(0 ${100 - progress * 100}% 0 0)` }}
        />
      </div>
      <span className="flex-none text-[15px] tabular-nums text-ink-soft">
        {formatDuration(playing || position > 0 ? position : durationSec)}
      </span>
    </div>
  );
}
