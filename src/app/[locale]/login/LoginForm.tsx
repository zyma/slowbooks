"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("Login");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const callbackURL = locale === "en" ? next : `/${locale}${next}`;
    const { error } = await authClient.signIn.magicLink({ email, callbackURL });
    setState(error ? "error" : "sent");
  }

  if (state === "sent") {
    return (
      <div role="status">
        <h1 className="text-[34px] leading-tight">{t("sentTitle")}</h1>
        <p className="mt-4 text-[18px] leading-normal text-ink-soft">{t("sentLead", { email })}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <h1 className="text-[34px] leading-tight">{t("title")}</h1>
      <p className="mt-3 text-[18px] leading-normal text-ink-soft">{t("lead")}</p>
      <label htmlFor="login-email" className="mt-8 text-[16px] text-ink-soft">
        {t("email")}
      </label>
      <input
        id="login-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1.5 min-h-12 rounded border border-line bg-print px-3.5 text-[17px]"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-4 min-h-[52px] rounded bg-album text-[18px] font-medium text-print disabled:opacity-60"
      >
        {state === "sending" ? t("sending") : t("submit")}
      </button>
      {state === "error" && (
        <p role="alert" className="mt-3 text-[16px]">
          {t("error")}
        </p>
      )}
    </form>
  );
}
