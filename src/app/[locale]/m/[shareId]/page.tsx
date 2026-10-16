import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { QrCode } from "@/components/QrCode";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonPrimary, buttonSecondary, recordDot } from "@/components/styles";
import { resolveLocale } from "@/i18n/locale";
import { getPathname, Link } from "@/i18n/navigation";
import { createClaimToken } from "@/lib/claim";
import { detectShareDevice } from "@/lib/device";
import { env } from "@/lib/env";
import { BOOK_MOMENTS, countMoments, excerpt, findMomentByShareId, guestExpiresAt } from "@/lib/moments";
import { photoPalette } from "@/lib/photo-color";
import { storySentences, styleVersion, tableColors } from "@/lib/card-style";
import { getSession } from "@/lib/session";
import { presignDownload } from "@/lib/storage";
import { SaveMoment } from "./SaveMoment";
import { ShareBar } from "./ShareBar";
import { StoryPlayer } from "./StoryPlayer";

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
  return {
    title,
    description,
    robots,
    openGraph: { type: "article", title, description },
  };
}

/** One numbered step for the owner, like the steps on the landing. */
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-5 border-t border-ink pt-7 sm:gap-7">
      <span className="font-serif text-[44px] leading-none">{n}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function BookProgress({ count, label }: { count: number; label: string }) {
  return (
    <div className="mt-6 max-w-[360px]">
      <div className="h-1.5 bg-line">
        <div className="h-full bg-berry" style={{ width: `${Math.min(100, (count / BOOK_MOMENTS) * 100)}%` }} />
      </div>
      <div className="mt-2 text-[15px] text-ink-soft">{label}</div>
    </div>
  );
}

/**
 * A moment is the card people get in a chat: an open book page on a table coloured by the photo.
 * The voice comes first. Visitors are invited to make their own card; the owner sees what to do next.
 */
export default async function MomentPage(props: PageProps<"/[locale]/m/[shareId]">) {
  const locale = await resolveLocale(props.params);
  setRequestLocale(locale);
  const { shareId } = await props.params;
  const moment = await findMomentByShareId(shareId);
  if (!moment) notFound();

  const { entry, photo, audio, owner, style } = moment;
  const t = await getTranslations("MomentPage");
  const tShare = await getTranslations("Share");
  const format = await getFormatter();
  const session = await getSession();
  const isOwner = session?.user.id === entry.userId;
  const isMember = !!session && !session.user.isAnonymous;

  const [photoUrl, palette, saved] = await Promise.all([
    presignDownload(photo.storageKey),
    photoPalette(photo.storageKey),
    isOwner ? countMoments(owner.id) : Promise.resolve(0),
  ]);
  const audioUrl = audio && (entry.voicePublic || isOwner) ? await presignDownload(audio.storageKey) : null;
  const voice =
    audioUrl && entry.waveform && audio?.durationSec
      ? { src: audioUrl, peaks: entry.waveform, durationSec: audio.durationSec }
      : null;
  const pageUrl = new URL(getPathname({ href: `/m/${shareId}`, locale }), env.NEXT_PUBLIC_APP_URL).toString();
  const phoneUrl = new URL(getPathname({ href: `/m/${shareId}/share`, locale }), env.NEXT_PUBLIC_APP_URL).toString();
  const text = entry.textFinal ?? "";
  const colors = tableColors(style, palette);
  const progress = t("progress", {
    count: saved,
    left: Math.max(0, BOOK_MOMENTS - saved),
  });

  return (
    <>
      <section
        className={`lb-table ${colors.dark ? "text-print" : ""}`}
        style={
          {
            "--table": colors.table,
            "--accent": colors.accent,
            backgroundImage: colors.image === "none" ? undefined : colors.image,
          } as React.CSSProperties
        }
      >
        <SiteHeader signedIn={isMember} />
        <div className="mx-auto w-full max-w-[1080px] px-4 pb-14 pt-2 sm:px-6 sm:pb-20">
          {isOwner && (
            <p
              className={`mb-5 -rotate-2 font-hand text-[28px] leading-none ${colors.dark ? "text-pencil" : "text-graphite"}`}
            >
              {t("ready")} &darr;
            </p>
          )}
          <article className="grid bg-print md:grid-cols-2">
            <div className="lb-gutter-l flex items-center justify-center px-5 pt-5 sm:px-10 sm:pt-10 md:py-12">
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from storage */}
              <img
                src={photoUrl}
                alt={entry.caption ?? t("photoAlt")}
                width={photo.width ?? undefined}
                height={photo.height ?? undefined}
                className="block h-auto max-h-[min(72svh,680px)] w-auto max-w-full"
              />
            </div>
            <div className="lb-gutter-r flex flex-col px-5 pb-8 pt-7 sm:px-10 sm:pb-12 md:pl-12 md:pt-12">
              <StoryPlayer text={text} voice={voice} quote={style.quote} />
              {entry.caption && <p className="mt-4 text-[16px] text-page-soft">{entry.caption}</p>}
              {style.signature && (
                <p className="mt-5 -rotate-1 font-hand text-[28px] leading-none text-graphite">{style.signature}</p>
              )}
              <div className="mt-auto pt-10 text-center text-[13px] text-pencil-soft">Slow Books</div>
            </div>
          </article>
        </div>
      </section>

      {isOwner ? (
        <section className="flex-1 px-5 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto grid w-full max-w-[680px] gap-14">
            <Step n={1}>
              <h2 className="text-[28px] leading-tight">{t("step1Title")}</h2>
              <ShareBar
                shareId={shareId}
                pageUrl={pageUrl}
                caption={entry.voicePublic && audio ? tShare("captionVoice") : tShare("captionText")}
                linkText={excerpt(text, 120)}
                deviceGuess={detectShareDevice((await headers()).get("user-agent") ?? "")}
                phoneQr={<QrCode value={phoneUrl} label={tShare("qrLabel")} className="size-[112px]" />}
                initialStyle={style}
                initialVersion={styleVersion(style)}
                palette={palette}
                sentences={storySentences(text)}
              />
            </Step>

            <Step n={2}>
              {owner.isAnonymous ? (
                <SaveMoment
                  claimPath={`/api/claim?t=${createClaimToken({ guestId: owner.id, shareId, locale })}`}
                  keptUntil={format.dateTime(guestExpiresAt(owner.createdAt), {
                    day: "numeric",
                    month: "long",
                  })}
                />
              ) : (
                <>
                  <h2 className="text-[28px] leading-tight">{t("ownerSavedTitle")}</h2>
                  <p className="mt-2.5 text-[17px] leading-normal text-ink-soft">{t("ownerSavedLead")}</p>
                </>
              )}
              <BookProgress count={saved} label={progress} />
            </Step>

            <Step n={3}>
              <h2 className="text-[28px] leading-tight">{t("step3Title")}</h2>
              <p className="mt-2.5 text-[17px] leading-normal text-ink-soft">{t("step3Lead")}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/moment/new" className={buttonPrimary}>
                  <span aria-hidden="true" className={recordDot} />
                  {t("createAnother")}
                </Link>
                {!owner.isAnonymous && (
                  <Link href="/app" className={buttonSecondary}>
                    {t("myMoments")}
                  </Link>
                )}
              </div>
            </Step>
          </div>
        </section>
      ) : (
        <section className="flex-1 px-5 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto w-full max-w-[1080px]">
            <div className="max-w-[620px]">
              <h2 className="font-serif text-[clamp(30px,4vw,44px)] leading-[1.05] tracking-[-0.02em]">
                {t("visitorTitle")}
              </h2>
              <p className="mt-4 text-[18px] leading-relaxed text-ink/80">{t("visitorLead")}</p>
              <Link href="/moment/new" className={`${buttonPrimary} mt-7`}>
                <span aria-hidden="true" className={recordDot} />
                {t("visitorCta")}
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
