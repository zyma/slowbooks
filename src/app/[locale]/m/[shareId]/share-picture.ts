import { useEffect, useState, useSyncExternalStore } from "react";
import { detectShareDevice, type ShareDevice } from "@/lib/device";

const noSubscription = () => () => {};

/** The device kind; until hydration it is the server's guess from the user agent. */
export function useShareDevice(serverGuess: ShareDevice) {
  return useSyncExternalStore(
    noSubscription,
    () => detectShareDevice(navigator.userAgent, navigator.maxTouchPoints),
    () => serverGuess,
  );
}

/** Fetches a picture ahead of time: share() must run right inside the tap, without waiting. */
export function usePictureFile(imageUrl: string, fileName: string) {
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(imageUrl)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (blob && !cancelled) setFile(new File([blob], fileName, { type: blob.type || "image/jpeg" }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [imageUrl, fileName]);
  return file;
}

export function downloadPicture(file: File | null, imageUrl: string, fileName: string) {
  const href = file ? URL.createObjectURL(file) : imageUrl;
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.click();
  if (file) setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/**
 * Hands the picture to the system share sheet, where the person picks a chat or Instagram.
 * The page link is copied first. On Android it also goes in the caption; Safari on iOS drops the
 * picture when text comes with it, so there the person pastes the link.
 * Falls back to a download where the browser cannot share files.
 */
export async function sharePicture({
  file,
  imageUrl,
  pageUrl,
  caption,
  withCaption,
}: {
  file: File | null;
  imageUrl: string;
  pageUrl: string;
  caption: string;
  withCaption: boolean;
}) {
  void navigator.clipboard?.writeText(pageUrl).catch(() => {});
  if (file && navigator.canShare?.({ files: [file] })) {
    const data = withCaption ? { files: [file], text: `${caption} ${pageUrl}` } : { files: [file] };
    try {
      await navigator.share(navigator.canShare(data) ? data : { files: [file] });
      return "shared";
    } catch (error) {
      // The person closed the share sheet: nothing to report.
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  downloadPicture(file, imageUrl, file?.name ?? "slow-books-moment.jpg");
  return "downloaded";
}
