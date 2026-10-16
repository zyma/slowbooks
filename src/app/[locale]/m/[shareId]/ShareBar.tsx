"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CardStyle } from "@/lib/card-style";
import type { ShareDevice } from "@/lib/device";
import { saveCardStyle } from "./actions";
import { CardStyler } from "./CardStyler";
import { useShareDevice } from "./share-picture";
import { SharePicture } from "./SharePicture";

const linkClass =
  "flex min-h-12 items-center justify-center rounded-full border border-ink px-3 text-[16px] text-ink no-underline hover:bg-surface";

/**
 * Sharing for the owner of a moment. The picture comes first: recipients see it before any link.
 * On a computer a QR code opens the same picture on the phone, where chats and Instagram are.
 * Plain links stay as a fallback; their preview comes from the Open Graph image.
 * Above the picture the owner can dress the card; the preview follows each saved change.
 */
export function ShareBar({
  shareId,
  pageUrl,
  caption,
  linkText,
  deviceGuess,
  phoneQr,
  initialStyle,
  initialVersion,
  palette,
  sentences,
}: {
  shareId: string;
  pageUrl: string;
  caption: string;
  /** Message text that goes with a plain link. */
  linkText: string;
  deviceGuess: ShareDevice;
  /** QR code to the phone page with the same picture. */
  phoneQr: ReactNode;
  initialStyle: CardStyle;
  initialVersion: string;
  palette: { table: string }[];
  sentences: string[];
}) {
  const t = useTranslations("Share");
  const tMoment = useTranslations("MomentPage");
  const device = useShareDevice(deviceGuess);
  const encodedUrl = encodeURIComponent(pageUrl);
  const router = useRouter();
  const [style, setStyle] = useState(initialStyle);
  const [version, setVersion] = useState(initialVersion);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const pending = useRef<CardStyle | null>(null);

  // Saves a moment after the last change, so typing a signature is one request, not one per letter.
  useEffect(() => {
    if (!pending.current) return;
    const next = pending.current;
    const timer = setTimeout(async () => {
      const result = await saveCardStyle(shareId, next);
      if (pending.current !== next) return;
      pending.current = null;
      if (!result.ok) return setStatus("error");
      setVersion(result.version);
      setStatus("saved");
      // The page's table follows the card's table.
      router.refresh();
    }, 600);
    return () => clearTimeout(timer);
  }, [style, shareId, router]);

  function change(next: CardStyle) {
    pending.current = next;
    setStatus("saving");
    setStyle(next);
  }

  return (
    <div className="mt-5">
      <CardStyler style={style} onChange={change} palette={palette} sentences={sentences} status={status} />
      <div className="mt-6 border-t border-line pt-6">
        <SharePicture
          shareId={shareId}
          pageUrl={pageUrl}
          caption={caption}
          deviceGuess={deviceGuess}
          version={version}
        />
      </div>

      {device === "computer" && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4 border border-line bg-surface p-5">
          <div className="flex-none text-ink">{phoneQr}</div>
          <div className="min-w-0 flex-[1_1_220px]">
            <h3 className="text-[22px]">{t("phoneTitle")}</h3>
            <p className="mt-2 text-[16px] leading-normal text-ink-soft">{t("phoneText")}</p>
          </div>
        </div>
      )}

      {/* Plain links are a fallback: the picture above is what people should send. */}
      <details className="group mt-6">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-[17px] text-ink-soft underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
          {tMoment("otherWays")}
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">
            &darr;
          </span>
        </summary>
        <h3 className="mt-3 font-sans text-[17px] tracking-normal text-ink-soft">{t("linksTitle")}</h3>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <a
            href={`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(linkText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Telegram
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${linkText} ${pageUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            WhatsApp
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            LinkedIn
          </a>
        </div>
      </details>
    </div>
  );
}
