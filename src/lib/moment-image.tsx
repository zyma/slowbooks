import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { routing } from "@/i18n/routing";
import { env } from "./env";
import { excerpt, type Moment } from "./moments";
import { CARD_SIZE, type CardFormat } from "./share-cards";
import { getObjectBuffer } from "./storage";
import { formatDuration, WAVE_WIDTH, wavePath } from "./waveform";

/**
 * Pictures of a moment, drawn like the moment page: a photo print on a dark album page.
 * - "og": 1200x630 link preview for Telegram, WhatsApp, LinkedIn;
 * - "post": 1080x1350 picture for chats and feeds;
 * - "story": 1080x1920 picture for stories, content kept clear of the Instagram controls.
 * All are JPEG: WhatsApp skips link previews over 600 KB, and a PNG of a photo is far bigger.
 */
export type ImageKind = "og" | CardFormat;

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

const LAYOUT = {
  og: { width: 1200, height: 630, box: { width: 520, height: 534 }, pad: 14, corner: 40, chars: 170 },
  post: { ...CARD_SIZE.post, box: { width: 900, height: 700 }, pad: 18, corner: 50, chars: 120 },
  story: { ...CARD_SIZE.story, box: { width: 860, height: 760 }, pad: 18, corner: 50, chars: 150 },
} satisfies Record<ImageKind, unknown>;

const FONT_DIR = join(process.cwd(), "src/assets/fonts");
let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 500; style: "normal" }[]> | null = null;

function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(join(FONT_DIR, "Alegreya-Regular.ttf")),
    readFile(join(FONT_DIR, "Alegreya-Medium.ttf")),
    readFile(join(FONT_DIR, "AlegreyaSans-Regular.ttf")),
  ]).then(([regular, medium, sans]) => [
    { name: "Alegreya", data: regular, weight: 400, style: "normal" },
    { name: "Alegreya", data: medium, weight: 500, style: "normal" },
    { name: "Alegreya Sans", data: sans, weight: 400, style: "normal" },
  ]);
  return fontsPromise;
}

/**
 * The photo print as one PNG: white border and the four album corners drawn by sharp (librsvg).
 * Satori positions absolute SVG shapes unreliably, so the image generator only places this picture.
 */
async function printDataUrl(key: string, aspect: number, kind: ImageKind) {
  const { box, pad, corner: s } = LAYOUT[kind];
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
  /** Where to find the moment, in the moment's language: the picture often travels without the link. */
  footer: string;
};

/** Image data for a published moment. Texts follow the language the story was told in. */
export async function momentImageData(moment: Moment): Promise<MomentImageData> {
  const { entry, photo, audio } = moment;
  const language = hasLocale(routing.locales, entry.detectedLanguage) ? entry.detectedLanguage : routing.defaultLocale;
  const t = await getTranslations({ locale: language, namespace: "ShareImage" });
  const showVoice = entry.voicePublic && !!audio;
  const site = new URL(env.NEXT_PUBLIC_APP_URL).host;
  return {
    photoKey: photo.storageKey,
    photoAspect: photo.width && photo.height ? photo.width / photo.height : 1,
    text: entry.textFinal ?? "",
    caption: entry.caption,
    peaks: showVoice ? entry.waveform : null,
    durationSec: showVoice ? audio.durationSec : null,
    language,
    footer: showVoice ? t("footerVoice", { site }) : t("footerText", { site }),
  };
}

function Wave({ peaks, width, height }: { peaks: number[]; width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${WAVE_WIDTH} 100`} preserveAspectRatio="none">
      <path d={wavePath(peaks)} fill={C.pencil} />
    </svg>
  );
}

export async function renderMomentImage(kind: ImageKind, data: MomentImageData) {
  const layout = LAYOUT[kind];
  const og = kind === "og";
  const [fonts, print] = await Promise.all([loadFonts(), printDataUrl(data.photoKey, data.photoAspect, kind)]);
  const text = quoted(excerpt(data.text, layout.chars), data.language);
  const hasVoice = !!data.peaks && data.peaks.length > 1 && !!data.durationSec;
  const size = {
    quote: { og: 33, post: 40, story: 44 }[kind],
    caption: { og: 24, post: 30, story: 32 }[kind],
    brand: { og: 28, post: 38, story: 40 }[kind],
    small: { og: 24, post: 28, story: 30 }[kind],
    footer: { og: 0, post: 32, story: 34 }[kind],
    wave: { og: [440, 48], post: [720, 64], story: [690, 64] }[kind],
  };

  const printImage = (
    <div style={{ display: "flex", flex: "none", boxShadow: "0 30px 60px -30px rgba(0,0,0,0.8)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered to an image by Satori */}
      <img src={print.src} width={print.width} height={print.height} alt="" />
    </div>
  );

  const voice = hasVoice ? (
    <div style={{ display: "flex", alignItems: "center", gap: og ? 18 : 26 }}>
      <Wave peaks={data.peaks!} width={size.wave[0]} height={size.wave[1]} />
      <div style={{ display: "flex", fontFamily: "Alegreya Sans", fontSize: size.small, color: C.pencilSoft }}>
        {formatDuration(data.durationSec!)}
      </div>
    </div>
  ) : null;

  const brand = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "8px 24px",
        borderTop: `2px solid ${C.line}`,
        paddingTop: og ? 18 : 26,
      }}
    >
      <div style={{ display: "flex", fontFamily: "Alegreya", fontWeight: 500, fontSize: size.brand, color: C.print }}>
        Slow Books
      </div>
      {!og && (
        <div style={{ display: "flex", fontFamily: "Alegreya Sans", fontSize: size.footer, color: C.pencil }}>
          {data.footer}
        </div>
      )}
    </div>
  );

  const words = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", fontFamily: "Alegreya", fontSize: size.quote, lineHeight: 1.42, color: C.pencil }}>
        {text}
      </div>
      {data.caption && (
        <div
          style={{
            display: "flex",
            marginTop: og ? 16 : 20,
            fontFamily: "Alegreya Sans",
            fontSize: size.caption,
            color: C.pencilSoft,
          }}
        >
          {data.caption}
        </div>
      )}
    </div>
  );

  const element = og ? (
    <div
      style={{
        width: layout.width,
        height: layout.height,
        display: "flex",
        alignItems: "center",
        gap: 60,
        background: C.album,
        padding: "48px 64px 48px 56px",
      }}
    >
      {printImage}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, alignSelf: "stretch", paddingTop: 8 }}>
        {words}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 24 }}>
          {voice}
          {brand}
        </div>
      </div>
    </div>
  ) : (
    <div
      style={{
        width: layout.width,
        height: layout.height,
        display: "flex",
        flexDirection: "column",
        background: C.album,
        // Stories: Instagram covers about 250px at the top and 340px at the bottom.
        padding: kind === "story" ? "250px 110px 340px" : "80px 90px 70px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>{printImage}</div>
        {voice && <div style={{ display: "flex", marginTop: 48 }}>{voice}</div>}
        <div style={{ display: "flex", marginTop: voice ? 36 : 48 }}>{words}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>{brand}</div>
    </div>
  );

  const png = await new ImageResponse(element, { width: layout.width, height: layout.height, fonts }).arrayBuffer();
  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" },
  });
}
