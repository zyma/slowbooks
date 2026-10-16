import { connection } from "next/server";
import { momentImageData, renderLinkPreview } from "@/lib/moment-image";
import { findMomentByShareId } from "@/lib/moments";

export const alt = "Slow Books";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

/** Link preview for Telegram, WhatsApp and LinkedIn: the photo and the first words of the story. */
export default async function Image({ params }: { params: Promise<{ locale: string; shareId: string }> }) {
  await connection();
  const { shareId } = await params;
  const moment = await findMomentByShareId(shareId);
  if (!moment) return new Response("Not found", { status: 404 });
  return renderLinkPreview(await momentImageData(moment));
}
