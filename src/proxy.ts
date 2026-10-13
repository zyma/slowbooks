import { getSessionCookie } from "better-auth/cookies";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createIntlMiddleware(routing);

/** Paths (without locale prefix) that need a signed-in user. */
const protectedPrefixes = ["/app"];

function stripLocale(pathname: string) {
  const [, first, ...rest] = pathname.split("/");
  if ((routing.locales as readonly string[]).includes(first)) {
    return { locale: first, path: "/" + rest.join("/") };
  }
  return { locale: routing.defaultLocale, path: pathname };
}

export function proxy(request: NextRequest) {
  const { locale, path } = stripLocale(request.nextUrl.pathname);
  const isProtected = protectedPrefixes.some((p) => path === p || path.startsWith(p + "/"));

  // Optimistic check only: the real check happens in server components.
  if (isProtected && !getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = locale === routing.defaultLocale ? "/login" : `/${locale}/login`;
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return intl(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
