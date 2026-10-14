import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/locale";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alegreya, Alegreya_Sans } from "next/font/google";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import "../globals.css";

// One family made for books: serif for stories and headings, sans for the interface.
const alegreya = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

const alegreyaSans = Alegreya_Sans({
  variable: "--font-alegreya-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(props: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = await resolveLocale(props.params);
  const t = await getTranslations({ locale, namespace: "Common" });
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
    title: { default: t("appName"), template: `%s · ${t("appName")}` },
    description: t("tagline"),
  };
}

export default async function LocaleLayout(props: LayoutProps<"/[locale]">) {
  const locale = await resolveLocale(props.params);
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${alegreya.variable} ${alegreyaSans.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{props.children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
