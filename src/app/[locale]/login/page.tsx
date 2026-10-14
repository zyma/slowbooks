import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { redirect } from "@/i18n/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { getMemberSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage(props: PageProps<"/[locale]/login">) {
  const locale = await resolveLocale(props.params);
  setRequestLocale(locale);
  // Guests may sign in: their moments move to the account (better-auth anonymous plugin).
  const session = await getMemberSession();
  if (session) redirect({ href: "/app", locale });

  const search = await props.searchParams;
  const next = typeof search.next === "string" && search.next.startsWith("/") ? search.next : "/app";

  return (
    <>
      <SiteHeader signedIn={false} />
      <main className="mx-auto w-full max-w-md flex-1 px-5 py-12 sm:py-16">
        <LoginForm next={next} />
      </main>
    </>
  );
}
