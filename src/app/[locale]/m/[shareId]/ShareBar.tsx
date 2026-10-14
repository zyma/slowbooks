"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { ShareDevice } from "@/lib/device";
import { useShareDevice } from "./share-picture";
import { SharePicture } from "./SharePicture";

const linkClass =
  "flex min-h-12 items-center justify-center rounded border border-control-dark px-3 text-[16px] font-medium text-print no-underline hover:border-print";

/**
 * Sharing for the owner of a moment. The picture comes first: recipients see it before any link.
 * On a computer a QR code opens the same picture on the phone, where chats and Instagram are.
 * Plain links stay as a fallback; their preview comes from the Open Graph image.
 */
export function ShareBar({
  shareId,
  pageUrl,
  caption,
  linkText,
  deviceGuess,
  phoneQr,
}: {
  shareId: string;
  pageUrl: string;
  caption: string;
  /** Message text that goes with a plain link. */
  linkText: string;
  deviceGuess: ShareDevice;
  /** QR code to the phone page with the same picture. */
  phoneQr: ReactNode;
}) {
  const t = useTranslations("Share");
  const device = useShareDevice(deviceGuess);
  const encodedUrl = encodeURIComponent(pageUrl);

  return (
    <section aria-labelledby="share-title" className="mt-12">
      <h2 id="share-title" className="text-[26px] text-print">
        {t("title")}
      </h2>
      <div className="mt-4">
        <SharePicture shareId={shareId} pageUrl={pageUrl} caption={caption} deviceGuess={deviceGuess} />
      </div>

      {device === "computer" && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4 rounded border border-line-dark p-5">
          <div className="flex-none rounded-sm bg-print p-2.5 text-ink">{phoneQr}</div>
          <div className="min-w-0 flex-[1_1_220px]">
            <h3 className="text-[22px] text-print">{t("phoneTitle")}</h3>
            <p className="mt-2 text-[16px] leading-normal">{t("phoneText")}</p>
          </div>
        </div>
      )}

      <h3 className="mt-8 font-sans text-[17px] font-medium text-pencil">{t("linksTitle")}</h3>
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
    </section>
  );
}
