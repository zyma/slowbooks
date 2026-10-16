"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { entries, momentStyles } from "@/db/schema";
import { parseCardStyle, styleVersion, type CardStyle } from "@/lib/card-style";
import { getSession } from "@/lib/session";

/** Saves how the owner's card looks. Only the owner of the moment may change it; the story is not touched. */
export async function saveCardStyle(
  shareId: string,
  input: CardStyle,
): Promise<{ ok: true; version: string } | { ok: false }> {
  const session = await getSession();
  if (!session) return { ok: false };
  const [entry] = await db
    .select({ id: entries.id, text: entries.textFinal })
    .from(entries)
    .where(and(eq(entries.shareId, shareId), eq(entries.userId, session.user.id)))
    .limit(1);
  if (!entry) return { ok: false };

  const style = parseCardStyle(input);
  // A chosen phrase must come from the story: the card never says what the storyteller did not.
  if (style.quote && !entry.text?.replace(/\s+/g, " ").includes(style.quote)) style.quote = null;

  await db
    .insert(momentStyles)
    .values({ entryId: entry.id, style })
    .onConflictDoUpdate({ target: momentStyles.entryId, set: { style, updatedAt: new Date() } });
  return { ok: true, version: styleVersion(style) };
}
