"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { PhotoPrint } from "@/components/PhotoPrint";
import { Waveform } from "@/components/Waveform";
import { useRouter } from "@/i18n/navigation";
import { locales, type AppLocale } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { formatDuration, toPeaks } from "@/lib/waveform";
import { createMoment, publishMoment, requestUpload, submitVoice, type ActionError } from "../actions";

const MAX_SECONDS = 180;
const MIN_SECONDS = 2;
const MAX_PHOTO_SIDE = 3200;
const LEVEL_INTERVAL_MS = 100;
const LIVE_WAVE_POINTS = 70;
const SPEECH_LANG: Record<AppLocale, string> = { ru: "ru-RU", en: "en-US", es: "es-ES", de: "de-DE" };
const LANGUAGE_LABEL: Record<AppLocale, string> = { ru: "RU", en: "EN", es: "ES", de: "DE" };

type Step = "photo" | "record" | "processing" | "edit";
type ErrorKey = ActionError | "photoFormat" | "micDenied" | "micMissing" | "tooShort";

// Web Speech API is not in the TypeScript DOM types yet: describe the part we use.
type SpeechResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: SpeechResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function speechRecognition(): (new () => Recognition) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Recognition) | null;
}

/** Recording format: AAC where the browser can (plays everywhere), otherwise Opus. */
function recordingType() {
  const types = ["audio/mp4;codecs=mp4a.40.2", "audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

/** Re-encodes the photo as JPEG, upright, at most 3200 px. Strips EXIF (location) on the way. */
async function preparePhoto(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("encode");
  return { blob, width, height };
}

/** Guests get an anonymous session on their first photo. */
async function ensureSession() {
  const { data } = await authClient.getSession();
  if (data) return true;
  const res = await authClient.signIn.anonymous();
  return !res.error;
}

/** Uploads straight to storage with a presigned URL. Returns the storage key. */
async function upload(
  kind: "photo" | "audio",
  blob: Blob,
  mime: string,
): Promise<{ ok: true; key: string } | { ok: false; error: ActionError }> {
  const target = await requestUpload({ kind, mime, size: blob.size });
  if (!target.ok) return target;
  const res = await fetch(target.url, { method: "PUT", body: blob, headers: { "Content-Type": mime } });
  return res.ok ? { ok: true, key: target.key } : { ok: false, error: "upload" };
}

export function MomentComposer() {
  const t = useTranslations("Composer");
  const locale = useLocale() as AppLocale;
  const router = useRouter();

  const [step, setStep] = useState<Step>("photo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);

  const [language, setLanguage] = useState<AppLocale>(locale);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [liveLevels, setLiveLevels] = useState<number[]>([]);
  const [liveText, setLiveText] = useState("");

  const [text, setText] = useState("");
  /** What the transcription step produced; decides the hint above the text. */
  const [textSource, setTextSource] = useState<"edited" | "raw" | "empty" | "typed">("typed");
  const [caption, setCaption] = useState("");
  const [voicePublic, setVoicePublic] = useState(true);
  const [hasVoice, setHasVoice] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const session = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    context: AudioContext;
    timer: number;
    chunks: Blob[];
    levels: number[];
    startedAt: number;
    recognition: Recognition | null;
    finalText: string;
    speechEnded: Promise<void>;
  } | null>(null);

  // Release the microphone if the person leaves mid-recording.
  useEffect(() => () => stopMedia(), []);

  function stopMedia() {
    const s = session.current;
    if (!s) return;
    window.clearInterval(s.timer);
    if (s.recorder.state !== "inactive") s.recorder.stop();
    s.stream.getTracks().forEach((track) => track.stop());
    void s.context.close();
    try {
      s.recognition?.stop();
    } catch {}
  }

  async function onPhotoChosen(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      let prepared;
      try {
        prepared = await preparePhoto(file);
      } catch {
        setError("photoFormat");
        return;
      }
      setPhotoUrl(URL.createObjectURL(prepared.blob));
      if (!(await ensureSession())) {
        setError("auth");
        return;
      }
      const uploaded = await upload("photo", prepared.blob, "image/jpeg");
      if (!uploaded.ok) {
        setError(uploaded.error);
        return;
      }
      const created = await createMoment({ photoKey: uploaded.key, width: prepared.width, height: prepared.height });
      if (!created.ok) {
        setError(created.error);
        return;
      }
      setEntryId(created.entryId);
      setStep("record");
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("micMissing");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("micDenied");
      return;
    }

    const type = recordingType();
    const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.start(1000);

    // Loudness levels for the live waveform and the stored peaks.
    const context = new AudioContext();
    void context.resume(); // Safari may create it suspended after the permission prompt
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const levels: number[] = [];
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) sum += v * v;
      levels.push(Math.sqrt(sum / samples.length));
      const elapsed = (performance.now() - startedAt) / 1000;
      setSeconds(elapsed);
      setLiveLevels(toPeaks(levels.slice(-LIVE_WAVE_POINTS), Math.min(LIVE_WAVE_POINTS, levels.length)));
      if (elapsed >= MAX_SECONDS) void stopRecording();
    }, LEVEL_INTERVAL_MS);

    session.current = {
      recorder,
      stream,
      context,
      timer,
      chunks,
      levels,
      startedAt,
      recognition: null,
      finalText: "",
      speechEnded: Promise.resolve(),
    };
    startSpeech();
    setLiveText("");
    setSeconds(0);
    setRecording(true);
  }

  /** Browser speech recognition, shown live under the photo. If it fails we still have the recording. */
  function startSpeech() {
    const s = session.current;
    const Recognition = speechRecognition();
    if (!s || !Recognition) return;
    const recognition = new Recognition();
    recognition.lang = SPEECH_LANG[language];
    recognition.interimResults = true;
    // Android Chrome repeats earlier phrases in continuous mode: restart after each phrase instead.
    recognition.continuous = !/Android/i.test(navigator.userAgent);
    let failed = false;
    let resolveEnded = () => {};
    s.speechEnded = new Promise((resolve) => (resolveEnded = resolve));
    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) s.finalText += `${result[0].transcript.trim()} `;
        else interim += result[0].transcript;
      }
      setLiveText(`${s.finalText}${interim}`.trim());
    };
    recognition.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") failed = true;
    };
    recognition.onend = () => {
      if (session.current === s && s.recorder.state === "recording" && !failed) {
        try {
          recognition.start();
          return;
        } catch {}
      }
      resolveEnded();
    };
    try {
      recognition.start();
      s.recognition = recognition;
    } catch {
      resolveEnded();
    }
  }

  async function stopRecording() {
    const s = session.current;
    if (!s || s.recorder.state === "inactive") return;
    setRecording(false);
    const duration = (performance.now() - s.startedAt) / 1000;
    const stopped = new Promise<void>((resolve) => (s.recorder.onstop = () => resolve()));
    stopMedia();
    await stopped;
    // Give recognition a moment to deliver the last phrase.
    await Promise.race([s.speechEnded, new Promise((r) => setTimeout(r, 1500))]);
    session.current = null;

    if (duration < MIN_SECONDS) {
      setError("tooShort");
      return;
    }
    const mime = s.recorder.mimeType || recordingType() || "audio/webm";
    const blob = new Blob(s.chunks, { type: mime });
    await sendVoice(blob, mime, duration, toPeaks(s.levels), s.finalText.trim());
  }

  async function sendVoice(blob: Blob, mime: string, duration: number, peaks: number[], browserText: string) {
    if (!entryId) return;
    setStep("processing");
    setError(null);
    try {
      const uploaded = await upload("audio", blob, mime);
      if (!uploaded.ok) {
        setError(uploaded.error);
        setStep("record");
        return;
      }
      const result = await submitVoice({
        entryId,
        audioKey: uploaded.key,
        mime,
        durationSec: Math.round(duration * 10) / 10,
        peaks,
        browserText,
        language,
      });
      if (!result.ok) {
        setError(result.error);
        setStep("record");
        return;
      }
      setText(result.text);
      if (!result.text) setTextSource("empty");
      else setTextSource(result.edited ? "edited" : "raw");
      setHasVoice(true);
      setStep("edit");
    } catch {
      setError("failed");
      setStep("record");
    }
  }

  /** No microphone or no wish to talk: type the story instead. */
  function writeInstead() {
    stopMedia();
    session.current = null;
    setRecording(false);
    setError(null);
    setHasVoice(false);
    setText("");
    setTextSource("typed");
    setStep("edit");
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!entryId || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await publishMoment({ entryId, text, caption, voicePublic: hasVoice && voicePublic });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/m/${result.shareId}`);
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }

  const errorText = error ? t(`errors.${error}`) : null;
  const editLead = {
    typed: "writeLead",
    empty: "checkLeadEmpty",
    edited: "checkLeadEdited",
    raw: "checkLeadRaw",
  }[textSource] as "writeLead" | "checkLeadEmpty" | "checkLeadEdited" | "checkLeadRaw";

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col px-5 pb-16">
      <h1 className="mt-2 text-[28px] leading-tight">{t("title")}</h1>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void onPhotoChosen(e.target.files?.[0])}
      />

      {step === "photo" && (
        <div className="mt-8">
          {photoUrl && busy ? (
            <PhotoPrint size="md" className="mx-auto w-[240px] opacity-60">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview from a blob URL */}
              <img src={photoUrl} alt="" />
            </PhotoPrint>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="flex min-h-[260px] w-full flex-col items-center justify-center gap-3 rounded border border-dashed border-ink-soft bg-print px-6 text-center"
            >
              <span className="text-[21px] font-medium">{t("choosePhoto")}</span>
              <span className="max-w-[26em] text-[16px] text-ink-soft">{t("choosePhotoHint")}</span>
            </button>
          )}
          {busy && <p className="mt-4 text-center text-[16px] text-ink-soft">{t("uploadingPhoto")}</p>}
        </div>
      )}

      {step !== "photo" && photoUrl && (
        <PhotoPrint size="md" className={`mx-auto mt-6 ${step === "edit" ? "w-[160px]" : "w-[220px]"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview from a blob URL */}
          <img src={photoUrl} alt={t("photoAlt")} />
        </PhotoPrint>
      )}

      {step === "record" && (
        <div className="mt-8 flex flex-col">
          {!recording && (
            <>
              <p className="text-[16px] text-ink-soft">{t("promptsTitle")}</p>
              <ul className="mt-2 list-disc pl-5 text-[17px] leading-relaxed">
                <li>{t("prompt1")}</li>
                <li>{t("prompt2")}</li>
                <li>{t("prompt3")}</li>
              </ul>
              <fieldset className="mt-6 flex flex-wrap items-center gap-2">
                <legend className="mb-2 text-[16px] text-ink-soft">{t("languageLabel")}</legend>
                {locales.map((l) => (
                  <label
                    key={l}
                    className={`flex min-h-11 min-w-12 cursor-pointer items-center justify-center rounded border px-3 text-[16px] ${
                      language === l ? "border-ink bg-ink text-print" : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="language"
                      value={l}
                      checked={language === l}
                      onChange={() => setLanguage(l)}
                      className="sr-only"
                    />
                    {LANGUAGE_LABEL[l]}
                  </label>
                ))}
              </fieldset>
            </>
          )}

          {recording && (
            <>
              <div className="flex items-center gap-2">
                <Waveform peaks={liveLevels.length > 1 ? liveLevels : [0, 0]} className="h-12 min-w-0 flex-1 text-ink" />
                <span aria-hidden="true" className="h-12 w-0.5 flex-none bg-rec" />
              </div>
              <p className="mt-3 min-h-[3.2em] font-serif text-[18px] leading-relaxed text-ink" aria-live="polite">
                {liveText || <span className="text-ink-soft">{t("listeningHint")}</span>}
              </p>
            </>
          )}

          <p className="mt-6 text-center tabular-nums">
            <span className="text-[28px] font-medium">{formatDuration(seconds)}</span>
            <span className="text-[16px] text-ink-soft"> {t("of", { max: formatDuration(MAX_SECONDS) })}</span>
          </p>
          <div className="mt-4 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => void (recording ? stopRecording() : startRecording())}
              aria-label={recording ? t("stop") : t("record")}
              className={`flex size-20 items-center justify-center rounded-full bg-rec ${recording ? "rec-live" : ""}`}
            >
              <span className={recording ? "size-6 rounded-[3px] bg-print" : "size-6 rounded-full bg-print"} />
            </button>
            <span className="text-[16px] text-ink-soft">{recording ? t("stop") : t("record")}</span>
          </div>
          {!recording && (
            <button
              type="button"
              onClick={writeInstead}
              className="mt-8 min-h-11 self-center text-[16px] underline underline-offset-4"
            >
              {t("writeInstead")}
            </button>
          )}
        </div>
      )}

      {step === "processing" && (
        <p className="mt-10 text-center text-[18px] text-ink-soft" role="status">
          {t("processing")}
        </p>
      )}

      {step === "edit" && (
        <form onSubmit={publish} className="mt-8 flex flex-col">
          <h2 id="story-label" className="text-[26px] leading-tight">
            {textSource === "typed" || textSource === "empty" ? t("writeTitle") : t("checkTitle")}
          </h2>
          <p className="mt-2 text-[16px] leading-normal text-ink-soft">
            {t(editLead)}
          </p>
          <textarea
            aria-labelledby="story-label"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            rows={10}
            className="mt-4 min-h-[260px] resize-y rounded border border-line bg-print px-4 py-3 font-serif text-[18px] leading-relaxed"
          />
          <label htmlFor="caption" className="mt-5 text-[16px] text-ink-soft">
            {t("captionLabel")}
          </label>
          <input
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={120}
            placeholder={t("captionPlaceholder")}
            className="mt-1.5 min-h-12 rounded border border-line bg-print px-3.5 text-[17px]"
          />
          {hasVoice && (
            <label className="mt-5 flex min-h-11 items-center gap-3 text-[16px] leading-snug">
              <input
                type="checkbox"
                checked={voicePublic}
                onChange={(e) => setVoicePublic(e.target.checked)}
                className="size-[22px] flex-none accent-album"
              />
              {t("voicePublic")}
            </label>
          )}
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="mt-6 min-h-14 rounded bg-album text-[19px] font-medium text-print disabled:opacity-60"
          >
            {busy ? t("creating") : t("create")}
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep("record");
            }}
            className="mt-2 min-h-11 self-center text-[16px] underline underline-offset-4"
          >
            {t("recordAgain")}
          </button>
        </form>
      )}

      {errorText && (
        <p role="alert" className="mt-6 rounded border border-rec/40 bg-print px-4 py-3 text-[16px] leading-normal">
          {errorText}
        </p>
      )}
    </div>
  );
}
