"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ShareDevice } from "@/lib/device";
import { CARD_FORMATS, CARD_SIZE, cardUrl, type CardFormat } from "@/lib/share-cards";
import { downloadPicture, sharePicture, usePictureFile, useShareDevice } from "./share-picture";

const FILE_NAME: Record<CardFormat, string> = {
  post: "slow-books-moment.jpg",
  story: "slow-books-story.jpg",
};

const primaryClass =
  "flex min-h-[56px] w-full items-center justify-center rounded bg-print px-6 text-[19px] font-medium text-ink hover:bg-white disabled:opacity-60";
const secondaryClass =
  "flex min-h-[52px] w-full items-center justify-center rounded border border-control-dark px-4 text-[17px] font-medium text-print hover:border-print";

/**
 * The picture of a moment the way it will be sent, with a format switch and the main share action.
 * Phones send it through the system share sheet (chats, Instagram); computers download it.
 */
export function SharePicture({
  shareId,
  pageUrl,
  caption,
  deviceGuess,
}: {
  shareId: string;
  pageUrl: string;
  /** Text before the link in the caption, like "Listen to the voice:". */
  caption: string;
  deviceGuess: ShareDevice;
}) {
  const t = useTranslations("Share");
  const device = useShareDevice(deviceGuess);
  const [format, setFormat] = useState<CardFormat>("post");
  const [notice, setNotice] = useState<string | null>(null);
  const files: Record<CardFormat, File | null> = {
    post: usePictureFile(cardUrl(shareId, "post"), FILE_NAME.post),
    story: usePictureFile(cardUrl(shareId, "story"), FILE_NAME.story),
  };
  const imageUrl = cardUrl(shareId, format);
  const size = CARD_SIZE[format];

  let hint: string;
  if (device === "computer") hint = t("hintComputer");
  else if (format === "story") hint = t("hintStory");
  else hint = device === "android" ? t("hintAndroid") : t("hintPhone");

  async function share() {
    setNotice(null);
    const result = await sharePicture({
      file: files[format],
      imageUrl,
      pageUrl,
      caption,
      // Instagram ignores the caption, and in stories the link goes on a sticker.
      withCaption: device === "android" && format === "post",
    });
    if (result === "downloaded") setNotice(t("downloaded"));
  }

  function copyLink() {
    void navigator.clipboard?.writeText(pageUrl).catch(() => {});
    setNotice(t("linkCopied"));
  }

  return (
    <div>
      <fieldset className="m-0 flex min-w-0 gap-1 rounded border border-control-dark p-1">
        <legend className="sr-only">{t("formatLabel")}</legend>
        {CARD_FORMATS.map((value) => (
          <label
            key={value}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-sm px-3 text-center text-[16px] font-medium text-pencil has-[:checked]:bg-print has-[:checked]:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-print"
          >
            <input
              type="radio"
              name="card-format"
              value={value}
              checked={format === value}
              onChange={() => setFormat(value)}
              className="sr-only"
            />
            {value === "post" ? t("formatPost") : t("formatStory")}
          </label>
        ))}
      </fieldset>

      {/* eslint-disable-next-line @next/next/no-img-element -- generated JPEG, the same file is sent */}
      <img
        key={format}
        src={imageUrl}
        width={size.width}
        height={size.height}
        alt={t("previewAlt")}
        className={`mt-5 block h-auto w-full border border-line-dark bg-corner shadow-[0_24px_48px_-24px_rgba(0,0,0,0.8)] ${format === "story" ? "max-w-[250px]" : "max-w-[340px]"}`}
      />
      <p className="mt-4 max-w-[30em] text-[16px] leading-normal text-pencil-soft">{hint}</p>

      <div className="mt-4 flex flex-col gap-2.5">
        {device === "computer" ? (
          <button
            type="button"
            onClick={() => downloadPicture(files[format], imageUrl, FILE_NAME[format])}
            className={primaryClass}
          >
            {t("download")}
          </button>
        ) : (
          <button type="button" onClick={() => void share()} disabled={!files[format]} className={primaryClass}>
            {t("sharePicture")}
          </button>
        )}
        <button type="button" onClick={copyLink} className={secondaryClass}>
          {t("copyLink")}
        </button>
      </div>
      <p aria-live="polite" className="mt-3 min-h-[1.5em]">
        {notice && (
          <span className="block rounded bg-print px-4 py-3 text-[16px] leading-normal text-ink">{notice}</span>
        )}
      </p>
    </div>
  );
}
