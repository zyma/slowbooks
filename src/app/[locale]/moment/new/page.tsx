import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { resolveLocale } from "@/i18n/locale";
import { getMemberSession } from "@/lib/session";
import { MomentComposer } from "./MomentComposer";

export async function generateMetadata(props: PageProps<"/[locale]/moment/new">): Promise<Metadata> {
  const locale = await resolveLocale(props.params);
  const t = await getTranslations({ locale, namespace: "Composer" });
  return { title: t("title"), robots: { index: false } };
}

/** Anyone can create a moment. A guest session is created on the first photo. */
export default async function NewMomentPage(props: PageProps<"/[locale]/moment/new">) {
  const locale = await resolveLocale(props.params);
  setRequestLocale(locale);
  const member = await getMemberSession();

  return (
    <>
      <SiteHeader signedIn={!!member} />
      <main className="flex-1">
        <MomentComposer />
      </main>
    </>
  );
}
