"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assets, entries } from "@/db/schema";
import { cleanUpTranscript, transcribeRecording } from "@/lib/gemini";
import { DAILY_LIMIT, MAX_RECORDING_SEC, newShareId } from "@/lib/moments";
import { getSession } from "@/lib/session";
import { buildStorageKey, getObjectBuffer, headObject, presignUpload } from "@/lib/storage";

/**
 * Server Functions for the moment composer. Guests (anonymous sessions) may call them;
 * every call checks that the moment belongs to the caller.
 */

export type ActionError = "auth" | "invalid" | "limit" | "upload" | "failed";
type Result<T> = ({ ok: true } & T) | { ok: false; error: ActionError };

const PHOTO_MAX_BYTES = 25 * 1024 * 1024;
const AUDIO_MAX_BYTES = 15 * 1024 * 1024;
/** Print size is 21 cm square: 2400 px on the short side is enough for 300 dpi. */
const PRINT_MIN_SIDE = 2400;

const AUDIO_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
};

async function currentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

async function ownEntry(entryId: string, userId: string) {
  const [entry] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.userId, userId)))
    .limit(1);
  return entry ?? null;
}

const uploadInput = z.object({
  kind: z.enum(["photo", "audio"]),
  mime: z.string().max(80),
  size: z.number().int().positive(),
});

/** Presigned URL the browser PUTs the file to. */
export async function requestUpload(input: z.infer<typeof uploadInput>): Promise<Result<{ url: string; key: string }>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "auth" };
  const parsed = uploadInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { kind, mime, size } = parsed.data;

  let ext: string | undefined;
  if (kind === "photo") {
    if (mime !== "image/jpeg" || size > PHOTO_MAX_BYTES) return { ok: false, error: "invalid" };
    ext = "jpg";
  } else {
    ext = AUDIO_TYPES[mime.split(";")[0]];
    if (!ext || size > AUDIO_MAX_BYTES) return { ok: false, error: "invalid" };
  }

  const key = buildStorageKey(user.id, kind, ext);
  return { ok: true, key, url: await presignUpload(key, mime) };
}

const createInput = z.object({
  photoKey: z.string().max(300),
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
});

/** Saves the uploaded photo as a new moment (no story yet). */
export async function createMoment(input: z.infer<typeof createInput>): Promise<Result<{ entryId: string }>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "auth" };
  const parsed = createInput.safeParse(input);
  if (!parsed.success || !parsed.data.photoKey.startsWith(`photos/${user.id}/`)) {
    return { ok: false, error: "invalid" };
  }
  const { photoKey, width, height } = parsed.data;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ value: today }] = await db
    .select({ value: count() })
    .from(entries)
    .where(and(eq(entries.userId, user.id), gt(entries.createdAt, since)));
  if (today >= (user.isAnonymous ? DAILY_LIMIT.guest : DAILY_LIMIT.member)) return { ok: false, error: "limit" };

  const file = await headObject(photoKey);
  if (!file) return { ok: false, error: "upload" };

  const entryId = await db.transaction(async (tx) => {
    const [photo] = await tx
      .insert(assets)
      .values({
        userId: user.id,
        kind: "photo",
        storageKey: photoKey,
        mime: "image/jpeg",
        sizeBytes: file.size,
        width,
        height,
        printQuality: Math.min(width, height) >= PRINT_MIN_SIDE ? "good" : "low",
      })
      .returning({ id: assets.id });
    const [entry] = await tx
      .insert(entries)
      .values({ userId: user.id, photoAssetId: photo.id })
      .returning({ id: entries.id });
    return entry.id;
  });

  return { ok: true, entryId };
}

const voiceInput = z.object({
  entryId: z.uuid(),
  audioKey: z.string().max(300),
  mime: z.string().max(80),
  durationSec: z.number().min(0).max(MAX_RECORDING_SEC),
  peaks: z.array(z.number().min(0).max(1)).max(200),
  /** What the browser recognized while the person spoke. Empty when it could not. */
  browserText: z.string().max(20000),
  language: z.enum(["ru", "en", "es", "de"]),
});

/**
 * Attaches the recording and returns the story text: the browser's text cleaned up by Gemini,
 * or Gemini's own transcription when the browser had nothing. Empty text means the person types it.
 */
export async function submitVoice(
  input: z.infer<typeof voiceInput>,
): Promise<Result<{ text: string; edited: boolean }>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "auth" };
  const parsed = voiceInput.safeParse(input);
  if (!parsed.success || !parsed.data.audioKey.startsWith(`audios/${user.id}/`)) {
    return { ok: false, error: "invalid" };
  }
  const { entryId, audioKey, mime, durationSec, peaks, browserText, language } = parsed.data;

  const entry = await ownEntry(entryId, user.id);
  if (!entry) return { ok: false, error: "invalid" };
  const file = await headObject(audioKey);
  if (!file) return { ok: false, error: "upload" };

  const [audio] = await db
    .insert(assets)
    .values({ userId: user.id, kind: "audio", storageKey: audioKey, mime, sizeBytes: file.size, durationSec })
    .returning({ id: assets.id });
  await db
    .update(entries)
    .set({ audioAssetId: audio.id, waveform: peaks, status: "polishing", error: null, updatedAt: new Date() })
    .where(eq(entries.id, entryId));

  let raw = browserText.trim();
  let text: string | null = null;
  let detectedLanguage: string | null = language;
  if (raw) {
    text = await cleanUpTranscript(raw);
  } else {
    const result = await transcribeRecording(await getObjectBuffer(audioKey), mime);
    if (result?.text) {
      raw = result.text;
      text = result.text;
      detectedLanguage = result.language ?? language;
    }
  }

  await db
    .update(entries)
    .set({
      transcriptRaw: raw || null,
      transcriptClean: text,
      detectedLanguage,
      status: "ready",
      updatedAt: new Date(),
    })
    .where(eq(entries.id, entryId));

  return { ok: true, text: text ?? raw, edited: text !== null && text !== raw };
}

const publishInput = z.object({
  entryId: z.uuid(),
  text: z.string().trim().min(1).max(6000),
  caption: z.string().trim().max(120),
  voicePublic: z.boolean(),
});

/** Saves the final text and gives the moment its public link. */
export async function publishMoment(input: z.infer<typeof publishInput>): Promise<Result<{ shareId: string }>> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "auth" };
  const parsed = publishInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { entryId, text, caption, voicePublic } = parsed.data;

  const entry = await ownEntry(entryId, user.id);
  if (!entry) return { ok: false, error: "invalid" };

  const shareId = entry.shareId ?? newShareId();
  await db
    .update(entries)
    .set({ textFinal: text, caption: caption || null, voicePublic, shareId, status: "ready", updatedAt: new Date() })
    .where(eq(entries.id, entryId));

  return { ok: true, shareId };
}
