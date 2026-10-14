/** Pictures of a moment people send: "post" (4:5) for chats and feeds, "story" (9:16) for stories. */
export const CARD_FORMATS = ["post", "story"] as const;
export type CardFormat = (typeof CARD_FORMATS)[number];

export const CARD_SIZE: Record<CardFormat, { width: number; height: number }> = {
  post: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};

export function isCardFormat(value: string): value is CardFormat {
  return (CARD_FORMATS as readonly string[]).includes(value);
}

export function cardUrl(shareId: string, format: CardFormat) {
  return `/api/moments/${shareId}/${format}`;
}
