/**
 * Pictures of a moment people send: "post" (3:4) for chats and feeds, "spread" (1.91:1) the open book,
 * "story" (9:16) for stories.
 */
export const CARD_FORMATS = ["post", "spread", "story"] as const;
export type CardFormat = (typeof CARD_FORMATS)[number];

export const CARD_SIZE: Record<CardFormat, { width: number; height: number }> = {
  post: { width: 1080, height: 1440 },
  spread: { width: 2064, height: 1080 },
  story: { width: 1080, height: 1920 },
};

export function isCardFormat(value: string): value is CardFormat {
  return (CARD_FORMATS as readonly string[]).includes(value);
}

/** `version` changes with the card style, so browsers and chats do not keep an old picture. */
export function cardUrl(shareId: string, format: CardFormat, version = "") {
  return `/api/moments/${shareId}/${format}${version ? `?v=${version}` : ""}`;
}
