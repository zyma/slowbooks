import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PhotoPrint } from "@/components/PhotoPrint";
import { QrCode } from "@/components/QrCode";
import { SiteHeader } from "@/components/SiteHeader";
import { VoicePlayer } from "@/components/VoicePlayer";
import { resolveLocale } from "@/i18n/locale";
import { getPathname, Link } from "@/i18n/navigation";
import { createClaimToken } from "@/lib/claim";
import { detectShareDevice } from "@/lib/device";
import { env } from "@/lib/env";
import { excerpt, findMomentByShareId, guestExpiresAt } from "@/lib/moments";
import { getSession } from "@/lib/session";
import { presignDownload } from "@/lib/storage";
import { SaveMoment } from "./SaveMoment";
import { ShareBar } from "./ShareBar";

export async function generateMetadata(props: PageProps<"/[locale]/m/[shareId]">): Promise<Metadata> {
  const locale = await resolveLocale(props.params);
  const { shareId } = await props.params;
  const moment = await findMomentByShareId(shareId);
  // Moments are shared by link only: keep them out of search engines.
  const robots = { index: false, follow: false };
  if (!moment) return { robots };
  const t = await getTranslations({ locale, namespace: "MomentPage" });
  const title = moment.entry.caption ?? t("defaultTitle");
  const description = excerpt(moment.entry.textFinal ?? "", 200);
  return { title, description, robots, openGraph: { type: "article", title, description } };
}

export default async function MomentPage(props: PageProps<"/[locale]/m/[shareId]">) {
  const locale = await resolveLocale(props.params);
  setRequestLocale(locale);
  const { shareId } = await props.params;
  const moment = await findMomentByShareId(shareId);
  if (!moment) notFound();

  const { entry, photo, audio, owner } = moment;
  const t = await getTranslations("MomentPage");
  const tShare = await getTranslations("Share");
  const format = await getFormatter();
  const session = await getSession();
  const isOwner = session?.user.id === entry.userId;
  const isMember = !!session && !session.user.isAnonymous;

  const photoUrl = await presignDownload(photo.storageKey);
  const audioUrl = audio && (entry.voicePublic || isOwner) ? await presignDownload(audio.storageKey) : null;
  const pageUrl = new URL(getPathname({ href: `/m/${shareId}`, locale }), env.NEXT_PUBLIC_APP_URL).toString();
  const phoneUrl = new URL(getPathname({ href: `/m/${shareId}/share`, locale }), env.NEXT_PUBLIC_APP_URL).toString();
  const text = entry.textFinal ?? "";

  return (
    <>
      <div className="bg-album text-pencil">
        <SiteHeader signedIn={isMember} tone="album" />
        <main className="mx-auto w-full max-w-[560px] px-5 pb-12 pt-4">
          <figure className="m-0">
            <PhotoPrint size="lg">
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from storage */}
              <img src={photoUrl} alt={entry.caption ?? t("photoAlt")} width={photo.width ?? undefined} height={photo.height ?? undefined} />
            </PhotoPrint>
            {audioUrl && entry.waveform && audio?.durationSec ? (
              <VoicePlayer src={audioUrl} peaks={entry.waveform} durationSec={audio.durationSec} className="mt-6" />
            ) : null}
            <blockquote className="m-0 mt-5 whitespace-pre-line font-serif text-[19px] leading-relaxed text-pencil">
              {text}
            </blockquote>
            {entry.caption && (
              <figcaption className="mt-3 text-[16px] text-pencil-soft">{entry.caption}</figcaption>
            )}
          </figure>

          {isOwner && (
            <ShareBar
              shareId={shareId}
              pageUrl={pageUrl}
              caption={entry.voicePublic && audio ? tShare("captionVoice") : tShare("captionText")}
              linkText={excerpt(text, 120)}
              deviceGuess={detectShareDevice((await headers()).get("user-agent") ?? "")}
              phoneQr={<QrCode value={phoneUrl} label={tShare("qrLabel")} className="size-[112px]" />}
            />
          )}
        </main>
      </div>

      <section className="flex-1 bg-paper">
        <div className="mx-auto w-full max-w-[560px] px-5 py-10">
          {isOwner && owner.isAnonymous && (
            <SaveMoment
              claimPath={`/api/claim?t=${createClaimToken({ guestId: owner.id, shareId, locale })}`}
              keptUntil={format.dateTime(guestExpiresAt(owner.createdAt), { day: "numeric", month: "long" })}
            />
          )}
          {isOwner && !owner.isAnonymous && (
            <div>
              <h2 className="text-[26px]">{t("ownerSavedTitle")}</h2>
              <p className="mt-2.5 text-[17px] leading-normal text-ink-soft">{t("ownerSavedLead")}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/moment/new"
                  className="flex min-h-[52px] items-center rounded bg-album px-6 text-[18px] font-medium text-print no-underline"
                >
                  {t("createAnother")}
                </Link>
                <Link href="/app" className="flex min-h-[52px] items-center rounded border border-ink px-6 text-[18px] font-medium text-ink no-underline">
                  {t("myMoments")}
                </Link>
              </div>
            </div>
          )}
          {!isOwner && (
            <div>
              <h2 className="text-[26px]">{t("visitorTitle")}</h2>
              <p className="mt-2.5 text-[17px] leading-normal text-ink-soft">{t("visitorLead")}</p>
              <Link
                href="/moment/new"
                className="mt-5 inline-flex min-h-14 items-center gap-3 rounded bg-album px-7 text-[19px] font-medium text-print no-underline"
              >
                <span aria-hidden="true" className="size-[11px] rounded-full bg-rec" />
                {t("visitorCta")}
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
