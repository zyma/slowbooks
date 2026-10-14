import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PhotoPrint } from "@/components/PhotoPrint";
import { SiteHeader } from "@/components/SiteHeader";
import { Waveform } from "@/components/Waveform";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getMemberSession } from "@/lib/session";
import { samplePeaks } from "@/lib/waveform";
import stump from "../../../public/samples/stump.jpg";
import couch from "../../../public/samples/couch.jpg";
import baby from "../../../public/samples/baby.jpg";

const heroPeaks = samplePeaks(1965);
const recordingPeaks = samplePeaks(37);
const bookPeaks = samplePeaks(1971);

function RecordDot() {
  return <span aria-hidden="true" className="size-3 flex-none rounded-full bg-rec" />;
}

export default async function LandingPage(props: PageProps<"/[locale]">) {
  const locale = await resolveLocale(props.params);
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const member = await getMemberSession();

  const primaryCta =
    "inline-flex min-h-[58px] items-center gap-3 rounded bg-print px-7 text-[20px] font-medium text-ink no-underline hover:bg-white";
  const sectionTitle = "font-serif text-[clamp(34px,3.4vw,48px)] leading-[1.1]";

  return (
    <>
      {/* Hero: the dark album page with one real-looking moment. */}
      <section className="bg-album text-pencil">
        <SiteHeader signedIn={!!member} tone="album" />
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-20 gap-y-14 px-5 pb-28 pt-6 sm:px-6 sm:pt-14">
          <div className="min-w-0 max-w-[560px] flex-[1_1_420px]">
            <h1 className="text-[clamp(40px,5.4vw,78px)] leading-[1.02] tracking-[-0.015em] text-print">{t("title")}</h1>
            <p className="mt-6 max-w-[28em] text-[19px] leading-normal sm:text-[21px]">{t("lead")}</p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href="/moment/new" className={primaryCta}>
                <RecordDot />
                {t("cta")}
              </Link>
              <span className="text-[17px] text-pencil-soft">{t("ctaNote")}</span>
            </div>
          </div>

          <figure className="m-0 min-w-0 max-w-[460px] flex-[1_1_360px]">
            <PhotoPrint size="lg" className="max-w-[300px] sm:max-w-none">
              <Image src={stump} alt={t("sampleAlt")} sizes="(max-width: 640px) 300px, 460px" priority />
            </PhotoPrint>
            <div className="reveal-wave mt-7">
              <Waveform peaks={heroPeaks} className="h-11 text-wave-dark" />
            </div>
            <blockquote className="m-0 mt-6 font-serif text-[19px] leading-relaxed sm:text-[20px]">
              <span className="reveal-text [animation-delay:1.2s]">{t("sampleStory1")}</span>{" "}
              <span className="reveal-text [animation-delay:1.9s]">{t("sampleStory2")}</span>{" "}
              <span className="reveal-text [animation-delay:2.6s]">{t("sampleStory3")}</span>
            </blockquote>
            <figcaption className="reveal-text mt-4 text-[17px] text-pencil-soft [animation-delay:3.1s]">
              {t("sampleCaption")}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* How it works: a real sequence, so the steps are numbered. */}
      <section className="bg-paper px-5 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-[1200px]">
          <h2 className={sectionTitle}>{t("howTitle")}</h2>
          <ol className="mt-14 flex list-none flex-wrap gap-x-12 gap-y-14 p-0">
            <li className="flex min-w-0 flex-[1_1_300px] flex-col border-t border-ink pt-6">
              <div className="flex items-baseline gap-4">
                <span className="font-serif text-[46px] leading-none">1</span>
                <h3 className="font-sans text-[23px] font-medium tracking-normal">{t("step1Title")}</h3>
              </div>
              <p className="mt-4 max-w-[24em] text-[18px] leading-normal text-ink-soft">{t("step1Text")}</p>
              <div className="mt-8 flex items-end sm:mt-10 sm:h-[210px]">
                <PhotoPrint size="sm" className="w-[168px]">
                  <Image src={baby} alt={t("step1Alt")} sizes="168px" />
                </PhotoPrint>
              </div>
            </li>
            <li className="flex min-w-0 flex-[1_1_300px] flex-col border-t border-ink pt-6">
              <div className="flex items-baseline gap-4">
                <span className="font-serif text-[46px] leading-none">2</span>
                <h3 className="font-sans text-[23px] font-medium tracking-normal">{t("step2Title")}</h3>
              </div>
              <p className="mt-4 max-w-[24em] text-[18px] leading-normal text-ink-soft">{t("step2Text")}</p>
              <div className="mt-8 flex items-center gap-5 sm:mt-10 sm:h-[210px]" aria-hidden="true">
                <span className="rec-live flex size-[72px] flex-none items-center justify-center rounded-full bg-rec">
                  <span className="size-[22px] rounded-[3px] bg-print" />
                </span>
                <div className="min-w-0 flex-1">
                  <Waveform peaks={recordingPeaks} className="h-12 text-ink" />
                  <div className="mt-2.5 text-[16px] tabular-nums text-ink-soft">0:37 / 3:00</div>
                </div>
              </div>
            </li>
            <li className="flex min-w-0 flex-[1_1_300px] flex-col border-t border-ink pt-6">
              <div className="flex items-baseline gap-4">
                <span className="font-serif text-[46px] leading-none">3</span>
                <h3 className="font-sans text-[23px] font-medium tracking-normal">{t("step3Title")}</h3>
              </div>
              <p className="mt-4 max-w-[24em] text-[18px] leading-normal text-ink-soft">{t("step3Text")}</p>
              <div className="mt-8 flex flex-wrap content-end gap-2.5 sm:mt-10 sm:h-[210px]">
                {["Instagram", "Telegram", "WhatsApp", "LinkedIn"].map((name) => (
                  <span key={name} className="rounded border border-ink px-4 py-2.5 text-[17px]">
                    {name}
                  </span>
                ))}
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* From moments to a book: a printed spread with the QR code to the voice. */}
      <section className="bg-album px-5 py-28 text-pencil sm:px-6 sm:py-32">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-20 gap-y-14">
          <div className="min-w-0 max-w-[430px] flex-[1_1_320px]">
            <h2 className={`${sectionTitle} text-print`}>{t("bookTitle")}</h2>
            <p className="mt-6 text-[19px] leading-relaxed">{t("bookText1")}</p>
            <p className="mt-4 text-[19px] leading-relaxed">{t("bookText2")}</p>
            <Link
              href="/moment/new"
              className="mt-9 inline-flex min-h-[52px] items-center rounded border border-print px-6 text-[18px] font-medium text-print no-underline"
            >
              {t("bookCta")}
            </Link>
            <p className="mt-4 text-[16px] text-pencil-soft">{t("bookNote")}</p>
          </div>
          <div className="min-w-0 flex-[1_1_560px]">
            <div className="flex shadow-[0_1px_0_rgba(0,0,0,0.35),0_36px_64px_-32px_rgba(0,0,0,0.8)] [container-type:inline-size]">
              <div className="aspect-square min-w-0 flex-1 bg-print bg-[linear-gradient(to_left,rgba(29,32,36,0.12),rgba(29,32,36,0)_7%)] p-[6cqw] pr-[4.5cqw]">
                <Image src={couch} alt={t("bookPhotoAlt")} sizes="(max-width: 640px) 45vw, 340px" className="size-full object-cover" />
              </div>
              <div className="flex aspect-square min-w-0 flex-1 flex-col bg-print bg-[linear-gradient(to_right,rgba(29,32,36,0.12),rgba(29,32,36,0)_7%)] p-[6cqw] pb-[5.5cqw] pl-[5cqw] text-ink">
                <p className="font-serif text-[1.85cqw] leading-relaxed">{t("bookSample")}</p>
                <p className="mt-[1.6cqw] text-[1.45cqw] text-ink-soft">{t("bookSampleCaption")}</p>
                <div className="mt-auto flex items-center gap-[2cqw]">
                  <QrPlaceholder />
                  <div className="min-w-0 flex-1">
                    <Waveform peaks={bookPeaks} className="h-[3cqw] text-ink" />
                    <div className="mt-[0.8cqw] text-[1.2cqw] text-ink-soft">{t("bookQr")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper px-5 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-[1200px]">
          <h2 className={sectionTitle}>{t("faqTitle")}</h2>
          <dl className="mt-12 flex flex-wrap gap-x-[72px] gap-y-11">
            {(["1", "2", "3", "4"] as const).map((n) => (
              <div key={n} className="min-w-0 max-w-[540px] flex-[1_1_420px]">
                <dt className="font-serif text-[25px] font-medium">{t(`faqQ${n}`)}</dt>
                <dd className="m-0 mt-2.5 text-[18px] leading-relaxed text-ink-soft">{t(`faqA${n}`)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="bg-album px-5 pb-10 pt-24 text-pencil-soft sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-[1200px]">
          <h2 className={`${sectionTitle} text-print`}>{t("finalTitle")}</h2>
          <Link href="/moment/new" className={`${primaryCta} mt-9`}>
            <RecordDot />
            {t("cta")}
          </Link>
          <div className="mt-24 flex flex-wrap items-baseline justify-between gap-4 border-t border-line-dark pt-6 text-[16px]">
            <span className="font-serif text-[21px] text-pencil">Slow Books</span>
            <span>Русский, English, Español, Deutsch</span>
          </div>
          <p className="mt-4 text-[14px] leading-normal">{t("credits")}</p>
        </div>
      </footer>
    </>
  );
}

/** A QR-like mark for the sample book page. Real books print a QR code to the recording. */
function QrPlaceholder() {
  const size = 25;
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const finder = (x: number, y: number, fx: number, fy: number) => {
    const dx = x - fx;
    const dy = y - fy;
    if (dx < -1 || dy < -1 || dx > 7 || dy > 7) return null;
    if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return false;
    return Math.max(Math.abs(dx - 3), Math.abs(dy - 3)) !== 2;
  };
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = finder(x, y, 0, 0) ?? finder(x, y, size - 7, 0) ?? finder(x, y, 0, size - 7) ?? random() < 0.48;
      if (on) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" aria-hidden="true" className="size-[8.5cqw] flex-none">
      <path d={d} fill="currentColor" />
    </svg>
  );
}
