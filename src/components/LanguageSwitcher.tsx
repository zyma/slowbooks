"use client";

import { useLocale, useTranslations } from "next-intl";
import { locales, type AppLocale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

const labels: Record<AppLocale, string> = { en: "EN", ru: "RU", es: "ES", de: "DE" };

export function LanguageSwitcher({ tone = "paper" }: { tone?: "album" | "paper" }) {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const colors = tone === "album" ? "border-[#5a6066] text-pencil" : "border-line text-ink";

  return (
    <label className="flex items-center">
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value as AppLocale })}
        className={`min-h-11 rounded border bg-transparent px-2.5 text-[16px] ${colors}`}
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
