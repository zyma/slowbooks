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
      <div>
        <h1 className="text-3xl">{t("sentTitle")}</h1>
        <p className="mt-4 text-ink-soft">{t("sentLead", { email })}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <h1 className="text-3xl">{t("title")}</h1>
      <p className="text-ink-soft">{t("lead")}</p>
      <label className="flex flex-col gap-1 text-sm">
        {t("email")}
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-line rounded-md px-3 py-2 bg-white text-base"
        />
      </label>
      <button
        type="submit"
        disabled={state === "sending"}
        className="bg-accent text-paper px-5 py-2.5 rounded-md disabled:opacity-60"
      >
        {state === "sending" ? t("sending") : t("submit")}
      </button>
      {state === "error" && <p className="text-sm text-red-700">{t("error")}</p>}
    </form>
  );
}
