import { z } from "zod";

/**
 * How a moment's card looks: the layout of the picture people send, the table under it,
 * one phrase shown large and a handwritten signature. This is layout, so it lives in
 * `moment_styles`, never on the entry. The story text itself is never changed here.
 */

/** "page": a book page with the whole story; "polaroid": a print with one phrase; "photo": the photo fills the card. */
export const CARD_LAYOUTS = ["page", "polaroid", "photo"] as const;
export type CardLayout = (typeof CARD_LAYOUTS)[number];

/** Tables that do not come from the photo. Drawn with gradients so the browser and Satori match. */
export const TEXTURES = {
  linen: {
    color: "#e6e0d2",
    accent: "#5f5a4c",
    image:
      "repeating-linear-gradient(0deg, rgba(120,110,90,0.07) 0px, rgba(120,110,90,0.07) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, rgba(120,110,90,0.06) 0px, rgba(120,110,90,0.06) 1px, transparent 1px, transparent 5px)",
  },
  kraft: {
    color: "#c9a679",
    accent: "#4f3a1f",
    image:
      "repeating-linear-gradient(90deg, rgba(90,60,25,0.05) 0px, rgba(90,60,25,0.05) 2px, transparent 2px, transparent 9px)",
  },
  album: { color: "#2e3236", accent: "#c9ccc6", image: "none" },
} as const;
export type TextureName = keyof typeof TEXTURES;
export const TEXTURE_NAMES = Object.keys(TEXTURES) as TextureName[];

/** How many table colours we take from a photo. */
export const PALETTE_SIZE = 5;

export const QUOTE_MAX = 220;
export const SIGNATURE_MAX = 60;

const cardStyleSchema = z.object({
  layout: z.enum(CARD_LAYOUTS),
  table: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("photo"),
      index: z
        .number()
        .int()
        .min(0)
        .max(PALETTE_SIZE - 1),
    }),
    z.object({
      kind: z.literal("texture"),
      name: z.enum(TEXTURE_NAMES as [TextureName, ...TextureName[]]),
    }),
  ]),
  quote: z.string().trim().max(QUOTE_MAX).nullable(),
  signature: z.string().trim().max(SIGNATURE_MAX).nullable(),
});

export type CardStyle = z.infer<typeof cardStyleSchema>;

export const DEFAULT_CARD_STYLE: CardStyle = {
  layout: "page",
  table: { kind: "photo", index: 0 },
  quote: null,
  signature: null,
};

/** A stored or submitted style, made safe: unknown values fall back to the default. Empty text means none. */
export function parseCardStyle(value: unknown): CardStyle {
  const parsed = cardStyleSchema.safeParse(value);
  if (!parsed.success) return DEFAULT_CARD_STYLE;
  const style = parsed.data;
  return {
    ...style,
    quote: style.quote || null,
    signature: style.signature || null,
  };
}

export type TableColors = {
  table: string;
  accent: string;
  image: string;
  dark: boolean;
};

/** The table colour for a style, from the photo's palette or a texture. */
export function tableColors(style: CardStyle, palette: { table: string; accent: string }[]): TableColors {
  if (style.table.kind === "texture") {
    const texture = TEXTURES[style.table.name];
    return {
      table: texture.color,
      accent: texture.accent,
      image: texture.image,
      dark: style.table.name === "album",
    };
  }
  const color = palette[style.table.index] ?? palette[0];
  return {
    table: color.table,
    accent: color.accent,
    image: "none",
    dark: false,
  };
}

/** Sentences of a story, offered as phrases to show large. */
export function storySentences(text: string, max = QUOTE_MAX) {
  return (text.replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]+["»“”]?|[^.!?…]+$/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length >= 12 && s.length <= max);
}

/** The phrase a short layout shows: the chosen one, or the first sentences that fit. */
export function cardQuote(style: CardStyle, text: string) {
  if (style.quote) return style.quote;
  const sentences = storySentences(text);
  let quote = "";
  for (const s of sentences) {
    if ((quote + " " + s).length > 150) break;
    quote = quote ? `${quote} ${s}` : s;
  }
  return quote || text.slice(0, 140).trim() + "…";
}

/** Changes whenever the look changes, so card URLs and previews refresh. */
export function styleVersion(style: CardStyle) {
  const json = JSON.stringify(style);
  let hash = 0;
  for (let i = 0; i < json.length; i++) hash = (Math.imul(hash, 31) + json.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}
