import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { getSession } from "@/lib/session";

export default async function LandingPage(props: PageProps<"/[locale]">) {
  const locale = await resolveLocale(props.params);
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const session = await getSession();

  return (
    <>
      <SiteHeader signedIn={!!session} />
      <main className="flex-1 px-6 py-16 max-w-3xl mx-auto w-full">
        <h1 className="text-4xl sm:text-5xl leading-tight">{t("title")}</h1>
        <p className="mt-6 text-lg text-ink-soft max-w-prose">{t("lead")}</p>
        <Link
          href={session ? "/app" : "/login"}
          className="inline-block mt-8 bg-accent text-paper px-6 py-3 rounded-md hover:opacity-90"
        >
          {t("cta")}
        </Link>
        <ol className="mt-16 grid gap-6 sm:grid-cols-3 text-sm text-ink-soft">
          {(["how1", "how2", "how3"] as const).map((key, i) => (
            <li key={key} className="border-t border-line pt-4">
              <span className="font-serif text-2xl text-ink block mb-2">{i + 1}</span>
              {t(key)}
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
