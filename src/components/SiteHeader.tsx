import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("Common");
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-line">
      <Link href="/" className="font-serif text-xl">
        {t("appName")}
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <LanguageSwitcher />
        {signedIn ? (
          <Link href="/app" className="underline-offset-4 hover:underline">
            {t("myBooks")}
          </Link>
        ) : (
          <Link href="/login" className="underline-offset-4 hover:underline">
            {t("signIn")}
          </Link>
        )}
      </nav>
    </header>
  );
}
