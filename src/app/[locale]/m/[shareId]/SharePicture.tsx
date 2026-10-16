"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ShareDevice } from "@/lib/device";
import { buttonPrimary, buttonSecondary } from "@/components/styles";
import { CARD_FORMATS, CARD_SIZE, cardUrl, type CardFormat } from "@/lib/share-cards";
import { downloadPicture, sharePicture, usePictureFile, useShareDevice } from "./share-picture";

const FILE_NAME: Record<CardFormat, string> = {
  post: "slow-books-moment.jpg",
  spread: "slow-books-spread.jpg",
  story: "slow-books-story.jpg",
};

const PREVIEW_WIDTH: Record<CardFormat, string> = {
  post: "max-w-[340px]",
  spread: "max-w-[560px]",
  story: "max-w-[250px]",
};

/**
 * The picture of a moment the way it will be sent, with a format switch and the main share action.
 * Phones send it through the system share sheet (chats, Instagram); computers download it.
 */
export function SharePicture({
  shareId,
  pageUrl,
  caption,
  deviceGuess,
  version = "",
}: {
  shareId: string;
  pageUrl: string;
  /** Text before the link in the caption, like "Listen to the voice:". */
  caption: string;
  deviceGuess: ShareDevice;
  /** Card style version: a new one means new pictures. */
  version?: string;
}) {
  const t = useTranslations("Share");
  const device = useShareDevice(deviceGuess);
  const [format, setFormat] = useState<CardFormat>("post");
  const [notice, setNotice] = useState<string | null>(null);
  const files: Record<CardFormat, File | null> = {
    post: usePictureFile(cardUrl(shareId, "post", version), FILE_NAME.post),
    spread: usePictureFile(cardUrl(shareId, "spread", version), FILE_NAME.spread),
    story: usePictureFile(cardUrl(shareId, "story", version), FILE_NAME.story),
  };
  const FORMAT_LABEL: Record<CardFormat, string> = {
    post: t("formatPost"),
    spread: t("formatSpread"),
    story: t("formatStory"),
  };
  const imageUrl = cardUrl(shareId, format, version);
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
      withCaption: device === "android" && format !== "story",
    });
    if (result === "downloaded") setNotice(t("downloaded"));
  }

  function copyLink() {
    void navigator.clipboard?.writeText(pageUrl).catch(() => {});
    setNotice(t("linkCopied"));
  }

  return (
    <div>
      <fieldset className="m-0 flex min-w-0 gap-1 rounded-full border border-line bg-surface p-1">
        <legend className="sr-only">{t("formatLabel")}</legend>
        {CARD_FORMATS.map((value) => (
          <label
            key={value}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full px-3 text-center text-[16px] leading-tight text-ink-soft has-[:checked]:bg-button has-[:checked]:text-surface has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
          >
            <input
              type="radio"
              name="card-format"
              value={value}
              checked={format === value}
              onChange={() => setFormat(value)}
              className="sr-only"
            />
            {FORMAT_LABEL[value]}
          </label>
        ))}
      </fieldset>

      {/* eslint-disable-next-line @next/next/no-img-element -- generated JPEG, the same file is sent */}
      <img
        key={`${format}-${version}`}
        src={imageUrl}
        width={size.width}
        height={size.height}
        alt={t("previewAlt")}
        className={`mt-5 block h-auto w-full bg-album ${PREVIEW_WIDTH[format]}`}
      />
      <p className="mt-4 max-w-[30em] text-[16px] leading-normal text-ink-soft">{hint}</p>

      <div className="mt-4 flex flex-col gap-2.5">
        {device === "computer" ? (
          <button
            type="button"
            onClick={() => downloadPicture(files[format], imageUrl, FILE_NAME[format])}
            className={`${buttonPrimary} w-full`}
          >
            {t("download")}
          </button>
        ) : (
          <button type="button" onClick={() => void share()} disabled={!files[format]} className={`${buttonPrimary} w-full`}>
            {t("sharePicture")}
          </button>
        )}
        <button type="button" onClick={copyLink} className={`${buttonSecondary} w-full`}>
          {t("copyLink")}
        </button>
      </div>
      <p aria-live="polite" className="mt-3 min-h-[1.5em]">
        {notice && (
          <span className="block border border-line bg-surface px-4 py-3 text-[16px] leading-normal text-ink">{notice}</span>
        )}
      </p>
    </div>
  );
}
