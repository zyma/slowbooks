import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** Site header on the paper: wordmark, language and the account link. */
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("Common");
  return (
    <header className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-6">
      <Link href="/" className="font-serif text-[22px] text-ink no-underline sm:text-[26px]">
        {t("appName")}
      </Link>
      <nav className="flex items-center gap-5 text-[17px]">
        <LanguageSwitcher />
        <Link href={signedIn ? "/app" : "/login"} className="text-ink underline-offset-4 hover:underline">
          {signedIn ? t("myMoments") : t("signIn")}
        </Link>
      </nav>
    </header>
  );
}
