import { connection } from "next/server";
import { renderBookCard, renderSpreadCard } from "@/lib/book-card";
import { momentImageData } from "@/lib/moment-image";
import { findMomentByShareId } from "@/lib/moments";
import { isCardFormat } from "@/lib/share-cards";

/** The picture people send, a page of the book: "post" (3:4), "spread" (1.91:1) or "story" (9:16). Public, like the moment page. */
export async function GET(_request: Request, ctx: RouteContext<"/api/moments/[shareId]/[format]">) {
  await connection();
  const { shareId, format } = await ctx.params;
  if (!isCardFormat(format)) return new Response("Not found", { status: 404 });
  const moment = await findMomentByShareId(shareId);
  if (!moment) return new Response("Not found", { status: 404 });
  const data = await momentImageData(moment);
  return format === "spread" ? renderSpreadCard(data) : renderBookCard(format, data);
}
