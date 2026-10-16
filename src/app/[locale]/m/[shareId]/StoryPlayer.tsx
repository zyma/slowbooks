"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Waveform } from "@/components/Waveform";
import { formatDuration } from "@/lib/waveform";

type Voice = { src: string; peaks: number[]; durationSec: number };

/**
 * The story with its voice. The voice comes first: a big button over the waveform.
 * While it plays, the words fill in from soft to full ink. We have no word timings,
 * so the place in the text follows the share of the recording played, by characters.
 */
export function StoryPlayer({
  text,
  voice,
  quote = null,
}: {
  text: string;
  voice: Voice | null;
  quote?: string | null;
}) {
  const t = useTranslations("MomentPage");
  const tVoice = useTranslations("Voice");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const duration = voice?.durationSec ?? 0;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const started = playing || position > 0;

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

  // Words with their place in the text, so each one knows when the voice has reached it.
  const reached = progress * text.length;
  const parts = text.split(/(\s+)/);
  const words: React.ReactNode[] = [];
  for (let i = 0, at = 0; i < parts.length; at += parts[i].length, i++) {
    const part = parts[i];
    words.push(
      !started || /^\s+$/.test(part) ? (
        part
      ) : (
        <span
          key={i}
          className={`transition-colors duration-300 ${at < reached ? "text-page-ink" : "text-page-ink/40"}`}
        >
          {part}
        </span>
      ),
    );
  }

  return (
    <div>
      {voice && (
        <div className="mb-7">
          <audio ref={audioRef} src={voice.src} preload="metadata" />
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? tVoice("pause") : undefined}
            className="inline-flex min-h-[52px] items-center gap-3 rounded-full bg-button pl-2 pr-6 text-[17px] text-surface hover:bg-black"
          >
            <span className="flex size-9 flex-none items-center justify-center rounded-full bg-surface text-ink">
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                {playing ? (
                  <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
                ) : (
                  <path d="M8.5 5.5v13l10-6.5z" fill="currentColor" />
                )}
              </svg>
            </span>
            <span>{playing ? tVoice("pause") : t("listen")}</span>
            <span className="tabular-nums opacity-70">
              {started ? formatDuration(position) : formatDuration(duration)}
            </span>
          </button>
          <div className="relative mt-4 h-9" aria-hidden="true">
            <Waveform peaks={voice.peaks} className="absolute inset-0 h-full text-wave-light" />
            <Waveform
              peaks={voice.peaks}
              className="absolute inset-0 h-full text-page-ink"
              style={{ clipPath: `inset(0 ${100 - progress * 100}% 0 0)` }}
            />
          </div>
        </div>
      )}
      <blockquote className="m-0 whitespace-pre-line font-serif text-[19px] leading-relaxed text-page-ink sm:text-[20px]">
        {quote && !started ? <Underlined text={text} phrase={quote} /> : words}
      </blockquote>
    </div>
  );
}

/** The story with the owner's chosen phrase underlined in pencil. Spaces in the text may differ from the phrase. */
function Underlined({ text, phrase }: { text: string; phrase: string }) {
  const pattern = phrase
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const match = new RegExp(pattern).exec(text);
  if (!match) return <>{text}</>;
  return (
    <>
      {text.slice(0, match.index)}
      <span className="lb-hl">{match[0]}</span>
      {text.slice(match.index + match[0].length)}
    </>
  );
}
