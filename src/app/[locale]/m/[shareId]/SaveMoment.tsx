"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { buttonPrimary, field } from "@/components/styles";
import { authClient } from "@/lib/auth-client";

/** A guest saves their moment: email sign-in link that ends on the claim route. */
export function SaveMoment({ claimPath, keptUntil }: { claimPath: string; keptUntil: string }) {
  const t = useTranslations("MomentPage");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: claimPath });
    setState(error ? "error" : "sent");
  }

  if (state === "sent") {
    return (
      <div role="status">
        <h2 className="text-[26px]">{t("savedTitle")}</h2>
        <p className="mt-2.5 text-[17px] leading-normal text-ink-soft">{t("savedLead", { email })}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <h2 className="text-[26px]">{t("saveTitle")}</h2>
      <p className="mt-2.5 text-[17px] leading-normal text-ink-soft">{t("saveLead", { date: keptUntil })}</p>
      <label htmlFor="save-email" className="mt-5 text-[16px] text-ink-soft">
        {t("email")}
      </label>
      <input
        id="save-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@example.com"
        className={`mt-1.5 ${field}`}
      />
      <button type="submit" disabled={state === "sending"} className={`${buttonPrimary} mt-3`}>
        {state === "sending" ? t("saving") : t("save")}
      </button>
      {state === "error" && (
        <p role="alert" className="mt-3 text-[16px]">
          {t("saveError")}
        </p>
      )}
      <p className="mt-4 text-[16px] leading-normal text-ink-soft">{t("saveNote")}</p>
    </form>
  );
}
