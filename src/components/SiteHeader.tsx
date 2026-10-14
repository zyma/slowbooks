import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** Site header. `album` sits on the dark album page, `paper` on light work pages. */
export function SiteHeader({ signedIn, tone = "paper" }: { signedIn: boolean; tone?: "album" | "paper" }) {
  const t = useTranslations("Common");
  const strong = tone === "album" ? "text-print" : "text-ink";
  return (
    <header className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-6">
      <Link href="/" className={`font-serif text-[22px] font-medium no-underline sm:text-[26px] ${strong}`}>
        {t("appName")}
      </Link>
      <nav className="flex items-center gap-5 text-[17px]">
        <LanguageSwitcher tone={tone} />
        <Link href={signedIn ? "/app" : "/login"} className={`underline-offset-4 hover:underline ${strong}`}>
          {signedIn ? t("myMoments") : t("signIn")}
        </Link>
      </nav>
    </header>
  );
}
