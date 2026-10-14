import { eq } from "drizzle-orm";
import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { readClaimToken } from "@/lib/claim";
import { env } from "@/lib/env";
import { moveGuestData } from "@/lib/moments";

/**
 * Where the "save this moment" email link lands after sign-in.
 * Same device: better-auth already moved the guest's moments, nothing to do.
 * Other device: the signed token names the guest, so we move their moments here.
 */
export async function GET(request: NextRequest) {
  const claim = readClaimToken(request.nextUrl.searchParams.get("t") ?? "");
  if (!claim) return NextResponse.redirect(new URL("/app", env.NEXT_PUBLIC_APP_URL));

  const session = await auth.api.getSession({ headers: request.headers });
  if (session && !session.user.isAnonymous && session.user.id !== claim.guestId) {
    const [guest] = await db
      .select({ id: user.id, isAnonymous: user.isAnonymous })
      .from(user)
      .where(eq(user.id, claim.guestId))
      .limit(1);
    if (guest?.isAnonymous) {
      await moveGuestData(guest.id, session.user.id);
      await db.delete(user).where(eq(user.id, guest.id));
    }
  }

  const locale = hasLocale(routing.locales, claim.locale) ? claim.locale : routing.defaultLocale;
  const path = getPathname({ href: `/m/${claim.shareId}`, locale });
  return NextResponse.redirect(new URL(path, env.NEXT_PUBLIC_APP_URL));
}
