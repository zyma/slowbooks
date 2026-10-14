import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale";
import { SiteHeader } from "@/components/SiteHeader";
import { getMemberSession } from "@/lib/session";

export default async function AppLayout(props: LayoutProps<"/[locale]/app">) {
  const locale = await resolveLocale(props.params);
  // Guests have a session too, but the account area is for people who signed in.
  const session = await getMemberSession();
  if (!session) redirect({ href: "/login", locale });

  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pb-16 pt-6 sm:px-6">{props.children}</main>
    </>
  );
}
