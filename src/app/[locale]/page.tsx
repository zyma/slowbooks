import Image, { type StaticImageData } from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { QrMark } from "@/components/QrMark";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonPrimary, recordDot } from "@/components/styles";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getMemberSession } from "@/lib/session";
import { samplePeaks } from "@/lib/waveform";
import { LandingBook } from "./LandingBook";
import stump from "../../../public/samples/stump.jpg";
import couch from "../../../public/samples/couch.jpg";
import baby from "../../../public/samples/baby.jpg";

function RecordDot() {
  return <span aria-hidden="true" className={recordDot} />;
}

/** Bars of a sample recording. Small book pages need bars: a smooth wave turns into a blot at this size. */
function WaveBars({ seed, className }: { seed: number; className: string }) {
  const peaks = samplePeaks(seed, 60);
  const d = peaks.map((v, i) => {
    const h = Math.max(2, Math.round(v * 22));
    return `M${i * 4} ${12 - h / 2}h2v${h}h-2z`;
  });
  return (
    <svg viewBox="0 0 240 24" preserveAspectRatio="none" aria-hidden="true" className={`block w-full ${className}`}>
      <path d={d.join("")} fill="currentColor" />
    </svg>
  );
}

/** A pencil note by hand, placed on a page in page widths. */
function Note({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`pointer-events-none absolute whitespace-nowrap font-hand text-[5.8cqw] leading-none text-graphite ${className}`}
    >
      {children}
    </span>
  );
}

/** A pencil arrow from a note to the thing it is about. */
function NoteArrow({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 16 24"
      aria-hidden="true"
      className={`pointer-events-none absolute fill-none stroke-graphite stroke-[1.3] ${className}`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 1C14 9 9 15 3 21M3 21l.5-5M3 21l5-1" />
    </svg>
  );
}

function PhotoPage({ src, alt, children }: { src: StaticImageData; alt: string; children?: React.ReactNode }) {
  return (
    <>
      <div className="absolute inset-0 flex items-center px-[9.5cqw] pb-[13cqw] pt-[11cqw]">
        <div className="relative aspect-[4/5] w-full">
          <Image src={src} alt={alt} fill sizes="(max-width: 639px) 80vw, (max-width: 1023px) 40vw, 26vw" className="object-cover" />
        </div>
      </div>
      {children}
    </>
  );
}

function StoryPage({ story, who, seed, qrNote }: { story: React.ReactNode; who: string; seed: number; qrNote: string }) {
  return (
    <div className="absolute inset-0 flex flex-col pb-[9cqw] pl-[11cqw] pr-[9cqw] pt-[11cqw]">
      <p className="m-0 font-serif text-[4.5cqw] leading-normal">{story}</p>
      <div className="mt-[3.5cqw] text-[3.5cqw] text-page-soft">{who}</div>
      <div className="mt-auto flex items-center gap-[4cqw]">
        <QrMark seed={seed} className="size-[17cqw] flex-none text-page-ink" />
        <div className="min-w-0 flex-1">
          <WaveBars seed={seed} className="h-[6cqw] text-page-ink" />
          <div className="mt-[1.6cqw] text-[2.9cqw] text-page-soft">{qrNote}</div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage(props: PageProps<"/[locale]">) {
  const locale = await resolveLocale(props.params);
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const member = await getMemberSession();

  const hl = (chunks: React.ReactNode) => <span className="lb-hl">{chunks}</span>;
  const qrNote = t("qrNote");
  const thoughtTitle = "font-serif text-[clamp(30px,3.4vw,46px)] leading-[1.04] tracking-[-0.025em]";
  const thoughtText = "mt-5 max-w-[30em] text-[18px] leading-normal text-ink/80 sm:text-[19px]";
  const kicker = "lb-accent mb-4 text-[14px] uppercase tracking-[0.08em]";
  const sectionTitle = "font-serif text-[clamp(34px,4vw,52px)] leading-[1.04] tracking-[-0.025em]";

  const pages = [
    <PhotoPage key="p1" src={stump} alt={t("sample1Alt")}>
      <Note className="right-[9cqw] top-[3cqw] -rotate-3">{t("sample1NoteTop")}</Note>
      <NoteArrow className="left-[55cqw] top-[8.5cqw] h-[18cqw] w-[12cqw]" />
      <Note className="bottom-[4cqw] left-[10cqw] -rotate-[1.5deg]">{t("sample1NoteBottom")}</Note>
    </PhotoPage>,
    <StoryPage key="p2" story={t.rich("sample1Story", { hl })} who={t("sample1Who")} seed={7} qrNote={qrNote} />,
    <PhotoPage key="p3" src={couch} alt={t("sample2Alt")}>
      <Note className="bottom-[4cqw] left-[10cqw] -rotate-1">{t("sample2NoteBottom")}</Note>
    </PhotoPage>,
    <StoryPage key="p4" story={t.rich("sample2Story", { hl })} who={t("sample2Who")} seed={11} qrNote={qrNote} />,
    <PhotoPage key="p5" src={baby} alt={t("sample3Alt")}>
      <Note className="right-[8cqw] top-[3cqw] rotate-2">{t("sample3NoteTop")}</Note>
      <NoteArrow className="right-[16cqw] top-[8.5cqw] h-[14cqw] w-[9cqw] -scale-x-100" />
      <Note className="bottom-[4cqw] left-[10cqw] -rotate-2">{t("sample3NoteBottom")}</Note>
    </PhotoPage>,
    <StoryPage key="p6" story={t.rich("sample3Story", { hl })} who={t("sample3Who")} seed={19} qrNote={qrNote} />,
    <div key="p7" className="absolute inset-0 flex items-center px-[9.5cqw] pb-[13cqw] pt-[11cqw]">
      <div className="flex aspect-[4/5] w-full items-center justify-center border border-dashed border-pencil-soft p-[10cqw] text-center text-[4.4cqw] text-page-soft">
        {t("emptyPhoto")}
      </div>
      <Note className="bottom-[4cqw] left-[10cqw] -rotate-[1.5deg]">{t("emptyNote")}</Note>
    </div>,
    <div key="p8" className="absolute inset-0 flex flex-col pb-[13cqw] pl-[11cqw] pr-[9cqw] pt-[11cqw]">
      <h3 className="text-[6.4cqw]">{t("blankTitle")}</h3>
      <div className="mt-[4cqw] flex-1 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(7.2cqw-1px),rgb(154_160_155/0.45)_calc(7.2cqw-1px),rgb(154_160_155/0.45)_7.2cqw)]" />
      <Link
        href="/moment/new"
        className="mt-[5cqw] inline-flex min-h-[11cqw] items-center gap-[2.5cqw] self-start rounded-full bg-button px-[6cqw] text-[4cqw] text-surface no-underline hover:bg-black"
      >
        <span aria-hidden="true" className="size-[2.4cqw] flex-none rounded-full bg-rec" />
        {t("blankCta")}
      </Link>
    </div>,
  ];

  const thoughts = [
    <div key="t0">
      <h1 className="text-[clamp(40px,5vw,64px)] leading-[0.98] tracking-[-0.03em]">
        {t.rich("title", { em: (chunks) => <em className="lb-accent not-italic">{chunks}</em> })}
      </h1>
      <p className={thoughtText}>{t("lead")}</p>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/moment/new" className={`${buttonPrimary} min-h-[56px] text-[19px]`}>
          <RecordDot />
          {t("cta")}
        </Link>
        <span className="text-[16px] text-ink/70">{t("ctaNote")}</span>
      </div>
      <p className="mt-8 -rotate-2 font-hand text-[26px] leading-none text-graphite">
        {t("flipHint")} <span className="hidden xl:inline">&rarr;</span>
        <span className="xl:hidden">&darr;</span>
      </p>
    </div>,
    ...([1, 2, 3] as const).map((n) => (
      <div key={`t${n}`}>
        <div className={kicker}>{t(`spread${n}Kicker`)}</div>
        <h2 className={thoughtTitle}>{t(`spread${n}Title`)}</h2>
        <p className={thoughtText}>{t(`spread${n}Text`)}</p>
        {n === 3 && (
          <Link href="/moment/new" className={`${buttonPrimary} mt-8 min-h-[56px] text-[19px]`}>
            <RecordDot />
            {t("cta")}
          </Link>
        )}
      </div>
    )),
  ];

  return (
    <>
      <LandingBook header={<SiteHeader signedIn={!!member} />} thoughts={thoughts} pages={pages} />

      {/* First a card: one photo and a voice, sent to the family chat. */}
      <section className="px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="-rotate-2 font-hand text-[30px] leading-none text-ink-soft">{t("postcardKicker")}</div>
            <h2 className={`mt-2 ${sectionTitle}`}>{t("postcardTitle")}</h2>
            <p className="mt-5 max-w-[30em] text-[18px] leading-relaxed text-ink/80 sm:text-[19px]">{t("postcardText")}</p>
            <ol className="mt-7 grid max-w-[30em] list-none gap-3 p-0 text-[17px] leading-snug sm:text-[18px]">
              {([1, 2, 3] as const).map((n) => (
                <li key={n} className="flex gap-4">
                  <span className="min-w-[22px] font-serif text-[28px] leading-none">{n}</span>
                  <span>{t(`postcardStep${n}`)}</span>
                </li>
              ))}
            </ol>
            <Link href="/moment/new" className={`${buttonPrimary} mt-9`}>
              <RecordDot />
              {t("postcardCta")}
            </Link>
          </div>

          <div aria-hidden="true" className="mx-auto flex w-full max-w-[420px] flex-col gap-2.5 bg-sky-soft px-4 py-6 sm:px-5">
            <div className="max-w-[78%] self-end rounded-2xl rounded-br-sm bg-surface px-3.5 py-2.5 text-[16px] leading-snug sm:text-[17px]">
              {t("chat1")}
            </div>
            <div className="self-end rounded-2xl rounded-br-sm bg-surface p-1.5">
              <div className="w-[min(230px,60vw)] bg-print px-3.5 pb-3 pt-3.5">
                <div className="relative aspect-[4/5]">
                  <Image src={stump} alt="" fill sizes="230px" className="object-cover" />
                </div>
                <p className="m-0 mt-2.5 font-serif text-[13.5px] leading-snug text-page-ink">{t("chatCard")}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <QrMark seed={7} className="size-[26px] flex-none text-page-ink" />
                  <WaveBars seed={7} className="h-2.5 text-page-ink" />
                </div>
              </div>
            </div>
            <div className="max-w-[78%] self-start rounded-2xl rounded-bl-sm bg-print px-3.5 py-2.5 text-[16px] leading-snug sm:text-[17px]">
              {t("chat2")}
            </div>
            <div className="max-w-[78%] self-start rounded-2xl rounded-bl-sm bg-print px-3.5 py-2.5 text-[16px] leading-snug sm:text-[17px]">
              {t("chat3")}
            </div>
          </div>
        </div>
      </section>

      {/* Then a book: saved cards add up to one. */}
      <section className="bg-honey-soft px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="-rotate-2 font-hand text-[30px] leading-none text-ink-soft">{t("bookKicker")}</div>
            <h2 className={`mt-2 ${sectionTitle}`}>{t("bookTitle")}</h2>
            <p className="mt-5 max-w-[30em] text-[18px] leading-relaxed text-ink/80 sm:text-[19px]">{t("bookText")}</p>
            <p className="mt-4 max-w-[30em] text-[16px] leading-relaxed text-ink-soft sm:text-[17px]">{t("bookNote")}</p>
          </div>

          <div aria-hidden="true" className="grid items-center gap-x-2.5 gap-y-5 sm:grid-cols-[1fr_auto_1fr]">
            <div className="lb-fan relative h-[230px]">
              {[
                { src: couch, r: "-14deg", x: "-60%" },
                { src: baby, r: "-6deg", x: "-30%" },
                { src: stump, r: "3deg", x: "0%" },
                { src: couch, r: "11deg", x: "30%" },
              ].map((card, i) => (
                <div
                  key={i}
                  className="lb-card absolute left-1/2 top-2.5 w-[120px] bg-print px-2 pb-[22px] pt-2"
                  style={{ "--r": card.r, "--x": card.x } as React.CSSProperties}
                >
                  <div className="relative aspect-[4/5]">
                    <Image src={card.src} alt="" fill sizes="120px" className="object-cover" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center text-ink-soft">
              <span className="whitespace-nowrap font-hand text-[22px]">{t("bookArrow")}</span>
              <svg
                viewBox="0 0 60 20"
                className="h-[22px] w-16 rotate-90 fill-none stroke-current stroke-[1.4] sm:rotate-0"
                strokeLinecap="round"
              >
                <path d="M2 12C18 4 36 4 54 10M54 10l-6-5M54 10l-7 3" />
              </svg>
            </div>
            <div className="lb-cover flex aspect-[3/4] w-[170px] flex-col justify-end justify-self-center bg-berry px-[18px] py-[22px] text-print">
              <div className="font-serif text-[26px] leading-[1.05]">{t("coverTitle")}</div>
              <div className="mt-1.5 text-[13px] opacity-80">{t("coverSub")}</div>
            </div>
            <div className="w-full max-w-[360px] justify-self-center sm:col-span-3">
              <div className="h-1.5 bg-line">
                <div className="h-full w-1/2 bg-berry" />
              </div>
              <div className="mt-2 text-center text-[15px] text-ink-soft">{t("progress")}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <h2 className={sectionTitle}>{t("faqTitle")}</h2>
          <dl className="mt-12 flex flex-wrap gap-x-[72px] gap-y-11">
            {(["1", "2", "3", "4"] as const).map((n) => (
              <div key={n} className="min-w-0 max-w-[540px] flex-[1_1_420px]">
                <dt className="font-serif text-[25px]">{t(`faqQ${n}`)}</dt>
                <dd className="m-0 mt-2.5 text-[18px] leading-relaxed text-ink-soft">{t(`faqA${n}`)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="px-5 pb-10 sm:px-6">
        <div className="mx-auto max-w-[1200px] border-t border-line pt-20 sm:pt-24">
          <h2 className={sectionTitle}>{t("finalTitle")}</h2>
          <Link href="/moment/new" className={`${buttonPrimary} mt-9 min-h-[58px] text-[20px]`}>
            <RecordDot />
            {t("cta")}
          </Link>
          <div className="mt-24 flex flex-wrap items-baseline justify-between gap-4 text-[15px] text-ink-soft">
            <span className="font-serif text-[21px] text-ink">Slow Books</span>
            <span>Русский, English, Español, Deutsch</span>
          </div>
          <p className="mt-4 text-[14px] leading-normal text-ink-soft">{t("credits")}</p>
        </div>
      </footer>
    </>
  );
}
