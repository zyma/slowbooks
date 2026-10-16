import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { env } from "./env";
import { cardQuote, tableColors, type CardStyle, type TableColors } from "./card-style";
import { excerpt, type Moment } from "./moments";
import { photoPalette } from "./photo-color";
import { getObjectBuffer } from "./storage";
import { formatDuration, WAVE_WIDTH, wavePath } from "./waveform";

/**
 * The link preview of a moment (1200x630, Telegram, WhatsApp, LinkedIn), drawn like the moment
 * page: a photo print on a dark album page. The cards people send are book pages, see book-card.tsx.
 * JPEG: WhatsApp skips link previews over 600 KB, and a PNG of a photo is far bigger.
 */

const C = {
  album: "#2E3236",
  corner: "#1C1F22",
  print: "#FBFAF7",
  pencil: "#C9CCC6",
  pencilSoft: "#9AA09B",
  line: "#454A4F",
};

/** The print keeps the photo's shape, within these limits: very tall or wide photos are cropped. */
const MIN_ASPECT = 2 / 3;
const MAX_ASPECT = 3 / 2;

const OG = { width: 1200, height: 630, box: { width: 520, height: 534 }, pad: 14, corner: 40, chars: 170 };

const FONT_DIR = join(process.cwd(), "src/assets/fonts");
let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 500; style: "normal" }[]> | null = null;

/** Caveat comes in subsets; each gets its own name and `HAND_FONT` lists them all, so every letter is found. */
const CAVEAT_FONTS = ["Caveat Latin", "Caveat Latin Ext", "Caveat Cyrillic"];
export const HAND_FONT = CAVEAT_FONTS.join(", ");

export function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(join(FONT_DIR, "Alegreya-Regular.ttf")),
    readFile(join(FONT_DIR, "Alegreya-Medium.ttf")),
    readFile(join(FONT_DIR, "AlegreyaSans-Regular.ttf")),
    // Handwriting for signatures.
    readFile(join(FONT_DIR, "Caveat-Latin.ttf")),
    readFile(join(FONT_DIR, "Caveat-LatinExt.ttf")),
    readFile(join(FONT_DIR, "Caveat-Cyrillic.ttf")),
  ]).then(([regular, medium, sans, ...caveat]) => [
    { name: "Alegreya", data: regular, weight: 400, style: "normal" },
    { name: "Alegreya", data: medium, weight: 500, style: "normal" },
    { name: "Alegreya Sans", data: sans, weight: 400, style: "normal" },
    ...caveat.map((data, i) => ({ name: CAVEAT_FONTS[i], data, weight: 400 as const, style: "normal" as const })),
  ]);
  return fontsPromise;
}

/**
 * The photo print as one PNG: white border and the four album corners drawn by sharp (librsvg).
 * Satori positions absolute SVG shapes unreliably, so the image generator only places this picture.
 */
async function printDataUrl(key: string, aspect: number) {
  const { box, pad, corner: s } = OG;
  const ratio = Math.min(Math.max(aspect, MIN_ASPECT), MAX_ASPECT);
  let photoWidth = box.width - pad * 2;
  let photoHeight = Math.round(photoWidth / ratio);
  if (photoHeight > box.height - pad * 2) {
    photoHeight = box.height - pad * 2;
    photoWidth = Math.round(photoHeight * ratio);
  }
  const photo = await sharp(await getObjectBuffer(key))
    .resize(photoWidth, photoHeight, { fit: "cover", position: "attention" })
    .jpeg({ quality: 88 })
    .toBuffer();
  const width = photoWidth + pad * 2;
  const height = photoHeight + pad * 2;
  const frame = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${C.print}"/></svg>`;
  const corners = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" fill="${C.corner}">
    <polygon points="0,0 ${s},0 0,${s}"/>
    <polygon points="${width - s},0 ${width},0 ${width},${s}"/>
    <polygon points="0,${height - s} 0,${height} ${s},${height}"/>
    <polygon points="${width},${height - s} ${width},${height} ${width - s},${height}"/>
  </svg>`;
  const png = await sharp(Buffer.from(frame))
    .composite([
      { input: photo, left: pad, top: pad },
      { input: Buffer.from(corners), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
  return { src: `data:image/png;base64,${png.toString("base64")}`, width, height };
}

function quoted(text: string, language: string) {
  if (language === "de") return `„${text}“`;
  if (language === "en") return `“${text}”`;
  return `«${text}»`;
}

export type MomentImageData = {
  photoKey: string;
  /** Width / height of the photo. */
  photoAspect: number;
  text: string;
  caption: string | null;
  peaks: number[] | null;
  durationSec: number | null;
  language: string;
  /** Absolute URL of the moment page, for the QR code on the cards. */
  pageUrl: string;
  /** Lines next to the QR code, in the moment's language: the picture often travels without the link. */
  scanHint: string;
  openHint: string;
  style: CardStyle;
  /** The table under the page, from the photo's palette or a texture. */
  table: TableColors;
  /** The phrase short layouts show large. */
  quote: string;
};

/** Image data for a published moment. Texts follow the language the story was told in. */
export async function momentImageData(moment: Moment): Promise<MomentImageData> {
  const { entry, photo, audio } = moment;
  const language = hasLocale(routing.locales, entry.detectedLanguage) ? entry.detectedLanguage : routing.defaultLocale;
  const t = await getTranslations({ locale: language, namespace: "ShareImage" });
  const showVoice = entry.voicePublic && !!audio;
  const site = new URL(env.NEXT_PUBLIC_APP_URL).host;
  const pageUrl = new URL(getPathname({ href: `/m/${entry.shareId}`, locale: language }), env.NEXT_PUBLIC_APP_URL);
  const palette = await photoPalette(photo.storageKey);
  const text = entry.textFinal ?? "";
  return {
    photoKey: photo.storageKey,
    photoAspect: photo.width && photo.height ? photo.width / photo.height : 1,
    text,
    caption: entry.caption,
    peaks: showVoice ? entry.waveform : null,
    durationSec: showVoice ? audio.durationSec : null,
    language,
    pageUrl: pageUrl.toString(),
    scanHint: showVoice ? t("scanVoice") : t("scanText"),
    openHint: t("openSite", { site }),
    style: moment.style,
    table: tableColors(moment.style, palette),
    quote: cardQuote(moment.style, text),
  };
}

function Wave({ peaks, width, height }: { peaks: number[]; width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${WAVE_WIDTH} 100`} preserveAspectRatio="none">
      <path d={wavePath(peaks)} fill={C.pencil} />
    </svg>
  );
}

export async function renderLinkPreview(data: MomentImageData) {
  const [fonts, print] = await Promise.all([loadFonts(), printDataUrl(data.photoKey, data.photoAspect)]);
  const text = quoted(excerpt(data.text, OG.chars), data.language);
  const hasVoice = !!data.peaks && data.peaks.length > 1 && !!data.durationSec;

  const element = (
    <div
      style={{
        width: OG.width,
        height: OG.height,
        display: "flex",
        alignItems: "center",
        gap: 60,
        background: C.album,
        padding: "48px 64px 48px 56px",
      }}
    >
      <div style={{ display: "flex", flex: "none", boxShadow: "0 30px 60px -30px rgba(0,0,0,0.8)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to an image by Satori */}
        <img src={print.src} width={print.width} height={print.height} alt="" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, alignSelf: "stretch", paddingTop: 8 }}>
        <div style={{ display: "flex", fontFamily: "Alegreya", fontSize: 33, lineHeight: 1.42, color: C.pencil }}>
          {text}
        </div>
        {data.caption && (
          <div style={{ display: "flex", marginTop: 16, fontFamily: "Alegreya Sans", fontSize: 24, color: C.pencilSoft }}>
            {data.caption}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 24 }}>
          {hasVoice && (
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Wave peaks={data.peaks!} width={440} height={48} />
              <div style={{ display: "flex", fontFamily: "Alegreya Sans", fontSize: 24, color: C.pencilSoft }}>
                {formatDuration(data.durationSec!)}
              </div>
            </div>
          )}
          <div style={{ display: "flex", borderTop: `2px solid ${C.line}`, paddingTop: 18 }}>
            <div style={{ display: "flex", fontFamily: "Alegreya", fontWeight: 500, fontSize: 28, color: C.print }}>
              Slow Books
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const png = await new ImageResponse(element, { width: OG.width, height: OG.height, fonts }).arrayBuffer();
  return jpegResponse(Buffer.from(png));
}

export async function jpegResponse(image: Buffer) {
  const jpeg = await sharp(image).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" },
  });
}
