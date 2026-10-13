import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { redirect } from "@/i18n/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage(props: PageProps<"/[locale]/login">) {
  const locale = await resolveLocale(props.params);
  setRequestLocale(locale);
  const session = await getSession();
  if (session) redirect({ href: "/app", locale });

  const search = await props.searchParams;
  const next = typeof search.next === "string" && search.next.startsWith("/") ? search.next : "/app";

  return (
    <>
      <SiteHeader signedIn={false} />
      <main className="flex-1 px-6 py-16 max-w-md mx-auto w-full">
        <LoginForm next={next} />
      </main>
    </>
  );
}
