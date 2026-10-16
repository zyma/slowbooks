import satori from "satori";
import sharp from "sharp";
import { encode } from "uqr";
import { HAND_FONT, jpegResponse, loadFonts, type MomentImageData } from "./moment-image";
import { CARD_SIZE, type CardFormat } from "./share-cards";
import { getObjectBuffer } from "./storage";
import { formatDuration, WAVE_WIDTH, wavePath } from "./waveform";

/**
 * The cards people send. In the "page" layout they are pages of the book: the photo, the whole story
 * and a QR code to the voice. The story is never cut: the font and the photo shrink until it fits.
 * - "post" (3:4): the page lies on the table with a thin margin. Instagram shows feed posts as 3:4.
 * - "story" (9:16): the page lies on the table, inside the area Instagram leaves free
 *   (about 250px at the top and 340px at the bottom are covered by its controls).
 * - "spread" (1.91:1, the widest Instagram keeps): the open book, the photo on the left page,
 *   the story and the QR code on the right one. Here only the font shrinks; the photo keeps its page.
 * The short layouts show one phrase instead of the whole story, which stays one QR scan away:
 * "polaroid" (a print with the phrase and a signature) and "photo" (the photo fills the card).
 * The table colour and the signature come from the owner's card style.
 */

const C = {
  album: "#2E3236",
  page: "#FBFAF7",
  ink: "#1D2024",
  inkSoft: "#5E646B",
  gutter: "linear-gradient(to right, rgba(29,32,36,0.12), rgba(29,32,36,0) 7%)",
};

/** Formats drawn as one page; "spread" is drawn by renderSpreadCard. */
type PageFormat = Exclude<CardFormat, "spread">;

const PAGE = {
  post: {
    left: 36,
    top: 36,
    width: 1008,
    height: 1368,
    margin: [80, 80, 72, 100],
    qr: 150,
    photoMax: 680,
  },
  story: {
    left: 24,
    top: 250,
    width: 1032,
    height: 1330,
    margin: [72, 64, 64, 88],
    qr: 140,
    photoMax: 640,
  },
} satisfies Record<PageFormat, unknown>;

/** Largest first. Below 28px (about 10pt on a phone) the story gets hard to read. */
const FONT_SIZES = [46, 42, 38, 35, 32, 30, 28, 26];
const GAP_PHOTO = 48;
const GAP_FOOTER = 44;

/** The photo keeps its shape within these limits: very tall or wide photos are cropped. */
const MIN_ASPECT = 2 / 3;
const MAX_ASPECT = 3 / 2;

type Fonts = Awaited<ReturnType<typeof loadFonts>>;

function StoryText({
  text,
  caption,
  size,
  width,
}: {
  text: string;
  caption: string | null;
  size: number;
  width: number;
}) {
  const paragraphs = text.split(/\n+/).filter((p) => p.trim());
  return (
    <div style={{ display: "flex", flexDirection: "column", width }}>
      {paragraphs.map((paragraph, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            marginTop: i ? Math.round(size * 0.5) : 0,
            fontFamily: "Alegreya",
            fontSize: size,
            lineHeight: 1.45,
            color: C.ink,
          }}
        >
          {paragraph}
        </div>
      ))}
      {caption && (
        <div
          style={{
            display: "flex",
            marginTop: Math.round(size * 0.6),
            fontFamily: "Alegreya Sans",
            fontSize: Math.max(24, Math.round(size * 0.7)),
            color: C.inkSoft,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

/** Height of the story at a font size, laid out by Satori itself, so the final picture matches. */
async function measureStory(data: MomentImageData, size: number, width: number, fonts: Fonts) {
  const svg = await satori(<StoryText text={data.text} caption={data.caption} size={size} width={width} />, {
    width,
    fonts,
  });
  return Number(/height="([\d.]+)"/.exec(svg)?.[1] ?? Infinity);
}

/** Picks the largest font that leaves the photo big enough; long stories get a smaller photo. */
async function chooseLayout(data: MomentImageData, format: PageFormat, fonts: Fonts) {
  const page = PAGE[format];
  const [top, right, bottom, left] = page.margin;
  const inner = {
    width: page.width - left - right,
    height: page.height - top - bottom,
  };
  const available = inner.height - page.qr - GAP_PHOTO - GAP_FOOTER;
  const ratio = Math.min(Math.max(data.photoAspect, MIN_ASPECT), MAX_ASPECT);
  const photoMax = Math.min(page.photoMax, inner.width / ratio);

  for (const size of FONT_SIZES) {
    const textHeight = await measureStory(data, size, inner.width, fonts);
    const photoHeight = Math.min(photoMax, available - textHeight);
    // Big type only next to a big photo; small type may share the page with a smaller one.
    if (photoHeight >= available * (size >= 32 ? 0.4 : 0.25)) {
      return {
        inner,
        size,
        photo: {
          width: Math.round(photoHeight * ratio),
          height: Math.floor(photoHeight),
        },
      };
    }
  }
  // Longer than a page: keep a small photo and the smallest type; the page cuts the end.
  const size = FONT_SIZES.at(-1)!;
  const height = Math.floor(available * 0.18);
  return { inner, size, photo: { width: Math.round(height * ratio), height } };
}

function QrMark({ value, size }: { value: string; size: number }) {
  const { data, size: modules } = encode(value, { ecc: "M", border: 0 });
  let d = "";
  data.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) d += `M${x} ${y}h1v1h-1z`;
    }),
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${modules} ${modules}`}>
      <path d={d} fill={C.ink} />
    </svg>
  );
}

/** QR code to the moment page, the voice wave and where to find the moment. */
function Footer({ data, width, qr }: { data: MomentImageData; width: number; qr: number }) {
  const hasVoice = !!data.peaks && data.peaks.length > 1 && !!data.durationSec;
  const footerText = {
    fontFamily: "Alegreya Sans",
    fontSize: 26,
    color: C.inkSoft,
    display: "flex",
  } as const;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        marginTop: "auto",
        paddingTop: GAP_FOOTER,
      }}
    >
      <QrMark value={data.pageUrl} size={qr} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 10 }}>
        {hasVoice && (
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg
              width={width - qr - 28 - 18 - 70}
              height={46}
              viewBox={`0 0 ${WAVE_WIDTH} 100`}
              preserveAspectRatio="none"
            >
              <path d={wavePath(data.peaks!)} fill={C.ink} />
            </svg>
            <div style={footerText}>{formatDuration(data.durationSec!)}</div>
          </div>
        )}
        <div style={footerText}>{data.scanHint}</div>
        <div style={{ ...footerText, fontSize: 24 }}>{data.openHint}</div>
      </div>
    </div>
  );
}

async function photoDataUrl(key: string, width: number, height: number) {
  const photo = await sharp(await getObjectBuffer(key))
    .resize(width, height, { fit: "cover", position: "attention" })
    .jpeg({ quality: 88 })
    .toBuffer();
  return `data:image/jpeg;base64,${photo.toString("base64")}`;
}

/** The table under the page. Satori takes the texture as a gradient over the colour. */
function tableStyle(data: MomentImageData) {
  const { table, image } = data.table;
  return image === "none" ? { backgroundColor: table } : { backgroundColor: table, backgroundImage: image };
}

export async function renderBookCard(format: PageFormat, data: MomentImageData) {
  if (data.style.layout === "polaroid") return renderPolaroidCard(format, data);
  if (data.style.layout === "photo") return renderPhotoCard(format, data);
  const fonts = await loadFonts();
  const page = PAGE[format];
  const [top, right, bottom, left] = page.margin;
  const layout = await chooseLayout(data, format, fonts);
  const photo = await photoDataUrl(data.photoKey, layout.photo.width, layout.photo.height);

  const pageElement = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // Satori adds padding to the size, so the page gets its inner size here.
        width: layout.inner.width,
        height: layout.inner.height,
        boxSizing: "content-box",
        padding: `${top}px ${right}px ${bottom}px ${left}px`,
        backgroundColor: C.page,
        backgroundImage: C.gutter,
        boxShadow: "0 30px 60px -32px rgba(0,0,0,0.55)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to an image by Satori */}
        <img src={photo} width={layout.photo.width} height={layout.photo.height} alt="" />
      </div>
      {/* Longer than a page even at the smallest size: the page cuts the end, the QR code always stays. */}
      <div
        style={{
          display: "flex",
          marginTop: GAP_PHOTO,
          maxHeight: layout.inner.height - layout.photo.height - GAP_PHOTO - page.qr - GAP_FOOTER,
          overflow: "hidden",
        }}
      >
        <StoryText text={data.text} caption={data.caption} size={layout.size} width={layout.inner.width} />
      </div>
      <Footer data={data} width={layout.inner.width} qr={page.qr} />
    </div>
  );

  const { width, height } = CARD_SIZE[format];
  const element = (
    <div
      style={{
        display: "flex",
        width,
        height,
        ...tableStyle(data),
        padding: `${page.top}px ${page.left}px 0`,
      }}
    >
      {pageElement}
    </div>
  );

  const svg = await satori(element, { width, height, fonts });
  return jpegResponse(await sharp(Buffer.from(svg)).png().toBuffer());
}

const SPREAD = { album: 24, margin: 96, footerBottom: 80, qr: 150 };
const SPREAD_FONT_SIZES = [...FONT_SIZES, 24, 22];

export async function renderSpreadCard(data: MomentImageData) {
  const fonts = await loadFonts();
  const { width, height } = CARD_SIZE.spread;
  const pageWidth = (width - SPREAD.album * 2) / 2;
  const pageHeight = height - SPREAD.album * 2;
  const inner = {
    width: pageWidth - SPREAD.margin * 2,
    height: pageHeight - SPREAD.margin - SPREAD.footerBottom,
  };

  const ratio = Math.min(Math.max(data.photoAspect, MIN_ASPECT), MAX_ASPECT);
  const box = {
    width: pageWidth - SPREAD.margin * 2,
    height: pageHeight - SPREAD.margin * 2,
  };
  const photoWidth = Math.round(Math.min(box.width, box.height * ratio));
  const photoHeight = Math.round(photoWidth / ratio);

  const available = inner.height - SPREAD.qr - GAP_FOOTER;
  let size = SPREAD_FONT_SIZES.at(-1)!;
  for (const candidate of SPREAD_FONT_SIZES) {
    if ((await measureStory(data, candidate, inner.width, fonts)) <= available) {
      size = candidate;
      break;
    }
  }

  const photo = await photoDataUrl(data.photoKey, photoWidth, photoHeight);
  const pageStyle = {
    display: "flex",
    flex: "none",
    width: pageWidth,
    height: pageHeight,
    backgroundColor: C.page,
  } as const;

  const element = (
    <div
      style={{
        display: "flex",
        width,
        height,
        ...tableStyle(data),
        padding: SPREAD.album,
      }}
    >
      <div
        style={{
          ...pageStyle,
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "linear-gradient(to left, rgba(29,32,36,0.14), rgba(29,32,36,0) 8%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to an image by Satori */}
        <img src={photo} width={photoWidth} height={photoHeight} alt="" />
      </div>
      <div
        style={{
          ...pageStyle,
          flexDirection: "column",
          // Satori adds padding to the size, so the page gets its inner size here.
          width: inner.width,
          height: inner.height,
          boxSizing: "content-box",
          padding: `${SPREAD.margin}px ${SPREAD.margin}px ${SPREAD.footerBottom}px`,
          backgroundImage: "linear-gradient(to right, rgba(29,32,36,0.14), rgba(29,32,36,0) 8%)",
        }}
      >
        {/* Longer than a page even at the smallest size: the page cuts the end. */}
        <div style={{ display: "flex", maxHeight: available, overflow: "hidden" }}>
          <StoryText text={data.text} caption={data.caption} size={size} width={inner.width} />
        </div>
        <Footer data={data} width={inner.width} qr={SPREAD.qr} />
      </div>
    </div>
  );

  const svg = await satori(element, { width, height, fonts });
  return jpegResponse(await sharp(Buffer.from(svg)).png().toBuffer());
}

/** Quotation marks of the language the story was told in. */
const QUOTES: Record<string, [string, string]> = {
  ru: ["«", "»"],
  es: ["«", "»"],
  de: ["„", "“"],
  en: ["“", "”"],
};

function quoted(data: MomentImageData) {
  const [open, close] = QUOTES[data.language] ?? QUOTES.en;
  const bare = data.quote.replace(/^[«„“"]+|[»“”"]+$/g, "");
  return `${open}${bare}${close}`;
}

/** Height of a block as Satori lays it out. */
async function measure(element: React.ReactElement, width: number) {
  const svg = await satori(element, { width, fonts: await loadFonts() });
  return Number(/height="([\d.]+)"/.exec(svg)?.[1] ?? Infinity);
}

function Phrase({ text, size, color, width }: { text: string; size: number; color: string; width: number }) {
  return (
    <div
      style={{
        display: "flex",
        width,
        fontFamily: "Alegreya",
        fontSize: size,
        lineHeight: 1.32,
        color,
      }}
    >
      {text}
    </div>
  );
}

function Signature({ text, size, color }: { text: string; size: number; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: HAND_FONT,
        fontSize: size,
        lineHeight: 1.1,
        color,
      }}
    >
      {text}
    </div>
  );
}

/** Largest phrase size that fits the height. */
async function phraseSize(text: string, width: number, maxHeight: number, sizes: number[]) {
  for (const size of sizes) {
    if ((await measure(<Phrase text={text} size={size} color={C.ink} width={width} />, width)) <= maxHeight)
      return size;
  }
  return sizes.at(-1)!;
}

/** Where the card sits: the whole picture for a post, the area Instagram leaves free for a story. */
const SAFE = {
  post: { top: 70, bottom: 70 },
  story: { top: 250, bottom: 340 },
} satisfies Record<PageFormat, unknown>;

/** A print on the table: the photo, the phrase and the signature on its white border, a small QR in the corner. */
async function renderPolaroidCard(format: PageFormat, data: MomentImageData) {
  const fonts = await loadFonts();
  const { width, height } = CARD_SIZE[format];
  const safe = SAFE[format];
  const printWidth = 860;
  const pad = 44;
  const inner = printWidth - pad * 2;
  const qr = 118;
  const signatureHeight = data.style.signature ? 70 : 0;
  const footer = qr + 28;
  const maxPrint = height - safe.top - safe.bottom;

  const text = quoted(data);
  const sizes = [44, 40, 36, 33, 30, 28];
  // The phrase gets up to a third of the print; the photo takes the rest, up to a square.
  const phraseMax = Math.round(maxPrint * 0.3);
  const size = await phraseSize(text, inner, phraseMax, sizes);
  const phraseHeight = await measure(<Phrase text={text} size={size} color={C.ink} width={inner} />, inner);
  const photoSide = Math.min(inner, maxPrint - pad * 2 - 36 - phraseHeight - signatureHeight - footer);
  const photo = await photoDataUrl(data.photoKey, inner, Math.max(200, Math.floor(photoSide)));

  const element = (
    <div
      style={{
        display: "flex",
        width,
        height,
        ...tableStyle(data),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: printWidth,
          marginTop: safe.top - safe.bottom,
          padding: pad,
          backgroundColor: C.page,
          transform: "rotate(-2deg)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.18), 0 30px 60px -28px rgba(0,0,0,0.55)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to an image by Satori */}
        <img src={photo} width={inner} height={Math.max(200, Math.floor(photoSide))} alt="" />
        <div style={{ display: "flex", marginTop: 36 }}>
          <Phrase text={text} size={size} color={C.ink} width={inner} />
        </div>
        {data.style.signature && (
          <div style={{ display: "flex", marginTop: 14 }}>
            <Signature text={data.style.signature} size={50} color={C.inkSoft} />
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            marginTop: 28,
          }}
        >
          <QrMark value={data.pageUrl} size={qr} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontFamily: "Alegreya Sans",
              fontSize: 24,
              color: C.inkSoft,
            }}
          >
            <div style={{ display: "flex" }}>{data.scanHint}</div>
            <div style={{ display: "flex", fontSize: 22 }}>{data.openHint}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const svg = await satori(element, { width, height, fonts });
  return jpegResponse(await sharp(Buffer.from(svg)).png().toBuffer());
}

/** The photo fills the card; the phrase and the signature sit on a dark fade at the bottom, the QR on a white tile. */
async function renderPhotoCard(format: PageFormat, data: MomentImageData) {
  const fonts = await loadFonts();
  const { width, height } = CARD_SIZE[format];
  const safe = SAFE[format];
  const side = 72;
  const qr = 128;
  const text = quoted(data);
  const textWidth = width - side * 2;
  const size = await phraseSize(text, textWidth, Math.round(height * 0.26), [56, 50, 46, 42, 38, 34]);
  const photo = await photoDataUrl(data.photoKey, width, height);
  const light = "#FBFAF7";

  const element = (
    <div
      style={{
        display: "flex",
        position: "relative",
        width,
        height,
        backgroundColor: C.album,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered to an image by Satori */}
      <img src={photo} width={width} height={height} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          backgroundImage:
            "linear-gradient(to top, rgba(18,20,22,0.82) 0%, rgba(18,20,22,0.55) 30%, rgba(18,20,22,0) 58%)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          left: side,
          bottom: safe.bottom,
          width: textWidth,
        }}
      >
        <Phrase text={text} size={size} color={light} width={textWidth} />
        {data.style.signature && (
          <div style={{ display: "flex", marginTop: 14 }}>
            <Signature text={data.style.signature} size={56} color="rgba(251,250,247,0.85)" />
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            marginTop: 34,
          }}
        >
          <div style={{ display: "flex", padding: 12, backgroundColor: light }}>
            <QrMark value={data.pageUrl} size={qr} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontFamily: "Alegreya Sans",
              fontSize: 26,
              color: "rgba(251,250,247,0.85)",
            }}
          >
            <div style={{ display: "flex" }}>{data.scanHint}</div>
            <div style={{ display: "flex", fontSize: 23 }}>{data.openHint}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const svg = await satori(element, { width, height, fonts });
  return jpegResponse(await sharp(Buffer.from(svg)).png().toBuffer());
}
