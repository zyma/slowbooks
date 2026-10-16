import { randomInt } from "node:crypto";
import { and, count, eq, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { assets, books, entries, momentStyles, user } from "@/db/schema";
import { parseCardStyle } from "./card-style";

/** About this many moments make a book: the landing and the moment page count towards it. */
export const BOOK_MOMENTS = 24;

/** Guests keep their moments this long unless they create an account. */
export const GUEST_DAYS = 30;

/** Moments one person can start per 24 hours. Guests get fewer: every moment costs AI quota. */
export const DAILY_LIMIT = { guest: 5, member: 50 } as const;

/** Longest recording we accept, in seconds. The browser stops at 3:00, this leaves a margin. */
export const MAX_RECORDING_SEC = 190;

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Random id for public links. 10 chars from 56 symbols is about 58 bits: not guessable. */
export function newShareId(length = 10) {
  let id = "";
  for (let i = 0; i < length; i++) id += ALPHABET[randomInt(ALPHABET.length)];
  return id;
}

export function guestExpiresAt(createdAt: Date) {
  return new Date(createdAt.getTime() + GUEST_DAYS * 24 * 60 * 60 * 1000);
}

/** First sentences of the story, cut on a word boundary. Used for previews and share text. */
export function excerpt(text: string, max = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentenceEnd > max * 0.5) return cut.slice(0, sentenceEnd + 1);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

/**
 * Moves everything a guest made to a real account. Called when a guest signs in
 * (better-auth anonymous plugin) and from the claim link when they sign in on another device.
 */
export async function moveGuestData(fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) return;
  await db.transaction(async (tx) => {
    await tx.update(entries).set({ userId: toUserId }).where(eq(entries.userId, fromUserId));
    await tx.update(assets).set({ userId: toUserId }).where(eq(assets.userId, fromUserId));
    await tx.update(books).set({ userId: toUserId }).where(eq(books.userId, fromUserId));
  });
}

const photoAsset = alias(assets, "photo_asset");
const audioAsset = alias(assets, "audio_asset");

/** A published moment with its files and owner, or null. */
export async function findMomentByShareId(shareId: string) {
  const [row] = await db
    .select({
      entry: entries,
      photo: photoAsset,
      audio: audioAsset,
      owner: { id: user.id, isAnonymous: user.isAnonymous, createdAt: user.createdAt },
      style: momentStyles.style,
    })
    .from(entries)
    .innerJoin(photoAsset, eq(photoAsset.id, entries.photoAssetId))
    .leftJoin(audioAsset, eq(audioAsset.id, entries.audioAssetId))
    .innerJoin(user, eq(user.id, entries.userId))
    .leftJoin(momentStyles, eq(momentStyles.entryId, entries.id))
    .where(eq(entries.shareId, shareId))
    .limit(1);
  if (!row || !row.entry.textFinal) return null;
  return { ...row, style: parseCardStyle(row.style) };
}

export type Moment = NonNullable<Awaited<ReturnType<typeof findMomentByShareId>>>;

/** Finished moments of one person: the ones with a story. */
export async function countMoments(userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(entries)
    .where(and(eq(entries.userId, userId), isNotNull(entries.textFinal)));
  return row?.n ?? 0;
}
