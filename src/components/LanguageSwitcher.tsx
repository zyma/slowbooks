"use client";

import { useLocale, useTranslations } from "next-intl";
import { locales, type AppLocale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

const labels: Record<AppLocale, string> = { en: "EN", ru: "RU", es: "ES", de: "DE" };

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center">
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value as AppLocale })}
        className="min-h-11 rounded-full border border-line bg-transparent px-3 text-[16px] text-ink"
      >
        {locales.map((l) => (
          <option key={l} value={l} className="text-ink">
            {labels[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
