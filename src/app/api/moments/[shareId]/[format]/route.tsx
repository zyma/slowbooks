import { connection } from "next/server";
import { momentImageData, renderMomentImage } from "@/lib/moment-image";
import { findMomentByShareId } from "@/lib/moments";
import { isCardFormat } from "@/lib/share-cards";

/** The picture people send: "post" (4:5) for chats and feeds, "story" (9:16). Public, like the moment page. */
export async function GET(_request: Request, ctx: RouteContext<"/api/moments/[shareId]/[format]">) {
  await connection();
  const { shareId, format } = await ctx.params;
  if (!isCardFormat(format)) return new Response("Not found", { status: 404 });
  const moment = await findMomentByShareId(shareId);
  if (!moment) return new Response("Not found", { status: 404 });
  return renderMomentImage(format, await momentImageData(moment));
}
