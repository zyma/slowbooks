/**
 * What the share buttons can do on this device:
 * - "android": the share sheet takes a picture with a caption;
 * - "phone": iPhone or iPad, the share sheet takes a picture but drops text sent with it (WebKit bug 251500);
 * - "computer": no Instagram or phone messengers in the share sheet, so we offer a download and a QR code.
 */
export type ShareDevice = "android" | "phone" | "computer";

/** `maxTouchPoints` is known only in the browser: iPadOS Safari presents itself as a Mac. */
export function detectShareDevice(userAgent: string, maxTouchPoints = 0): ShareDevice {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "phone";
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return "phone";
  return "computer";
}
