import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/locale";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inter, Literata } from "next/font/google";
import { routing } from "@/i18n/routing";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(props: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocale(props.params);
  const t = await getTranslations({ locale, namespace: "Common" });
  return {
    title: { default: t("appName"), template: `%s · ${t("appName")}` },
    description: t("tagline"),
  };
}

export default async function LocaleLayout(props: LayoutProps<"/[locale]">) {
  const locale = await resolveLocale(props.params);
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${inter.variable} ${literata.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{props.children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
