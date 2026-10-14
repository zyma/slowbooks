import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { resolveLocale } from "@/i18n/locale";
import { getPathname, Link } from "@/i18n/navigation";
import { detectShareDevice } from "@/lib/device";
import { env } from "@/lib/env";
import { findMomentByShareId } from "@/lib/moments";
import { getMemberSession } from "@/lib/session";
import { SharePicture } from "../SharePicture";

export async function generateMetadata(props: PageProps<"/[locale]/m/[shareId]/share">): Promise<Metadata> {
  const locale = await resolveLocale(props.params);
  const t = await getTranslations({ locale, namespace: "Share" });
  return { title: t("pageTitle"), robots: { index: false, follow: false } };
}

/**
 * Opened on a phone from the QR code on the moment page: chats and Instagram live on the phone.
 * Shows the picture and sends it through the system share sheet.
 */
export default async function SharePage(props: PageProps<"/[locale]/m/[shareId]/share">) {
  const locale = await resolveLocale(props.params);
  setRequestLocale(locale);
  const { shareId } = await props.params;
  const moment = await findMomentByShareId(shareId);
  if (!moment) notFound();

  const t = await getTranslations("Share");
  const member = await getMemberSession();
  const pageUrl = new URL(getPathname({ href: `/m/${shareId}`, locale }), env.NEXT_PUBLIC_APP_URL).toString();
  const voice = moment.entry.voicePublic && !!moment.audio;

  return (
    <div className="flex-1 bg-album text-pencil">
      <SiteHeader signedIn={!!member} tone="album" />
      <main className="mx-auto w-full max-w-[460px] px-5 pb-14 pt-2">
        <h1 className="text-[32px] leading-tight text-print">{t("pageTitle")}</h1>
        <div className="mt-6">
          <SharePicture
            shareId={shareId}
            pageUrl={pageUrl}
            caption={voice ? t("captionVoice") : t("captionText")}
            deviceGuess={detectShareDevice((await headers()).get("user-agent") ?? "")}
          />
        </div>
        <Link href={`/m/${shareId}`} className="mt-4 inline-block text-[17px] text-print underline underline-offset-4">
          {t("openMoment")}
        </Link>
      </main>
    </div>
  );
}
