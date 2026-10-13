import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { SiteHeader } from "@/components/SiteHeader";
import { getSession } from "@/lib/session";

export default async function AppLayout(props: LayoutProps<"/[locale]/app">) {
  const locale = await resolveLocale(props.params);
  const session = await getSession();
  if (!session) redirect({ href: "/login", locale });

  return (
    <>
      <SiteHeader signedIn />
      <main className="flex-1 px-6 py-10 max-w-4xl mx-auto w-full">{props.children}</main>
    </>
  );
}
