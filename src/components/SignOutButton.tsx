"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const t = useTranslations("Common");
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      className="min-h-11 text-[16px] text-ink-soft underline-offset-4 hover:text-ink hover:underline"
    >
      {t("signOut")}
    </button>
  );
}
