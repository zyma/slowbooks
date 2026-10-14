import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { assets, entries } from "@/db/schema";
import { PhotoPrint } from "@/components/PhotoPrint";
import { SignOutButton } from "@/components/SignOutButton";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { excerpt } from "@/lib/moments";
import { getMemberSession } from "@/lib/session";
import { presignDownload } from "@/lib/storage";

export default async function MomentsPage(props: PageProps<"/[locale]/app">) {
  const locale = await resolveLocale(props.params);
  setRequestLocale(locale);
  const t = await getTranslations("App");
  const session = (await getMemberSession())!;

  const rows = await db
    .select({ entry: entries, photoKey: assets.storageKey })
    .from(entries)
    .innerJoin(assets, eq(assets.id, entries.photoAssetId))
    .where(and(eq(entries.userId, session.user.id), isNotNull(entries.shareId)))
    .orderBy(desc(entries.createdAt));
  const moments = await Promise.all(
    rows.map(async ({ entry, photoKey }) => ({ entry, photoUrl: await presignDownload(photoKey) })),
  );

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-[clamp(32px,3.4vw,44px)] leading-tight">{t("title")}</h1>
        <div className="flex items-center gap-4">
          <span className="text-[16px] text-ink-soft">{session.user.email}</span>
          <SignOutButton />
        </div>
      </div>

      <Link
        href="/moment/new"
        className="mt-8 inline-flex min-h-14 items-center gap-3 rounded bg-album px-7 text-[19px] font-medium text-print no-underline"
      >
        <span aria-hidden="true" className="size-[11px] rounded-full bg-rec" />
        {t("create")}
      </Link>

      {moments.length === 0 ? (
        <p className="mt-10 max-w-[32em] text-[18px] leading-normal text-ink-soft">{t("empty")}</p>
      ) : (
        <ul className="mt-12 grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-8 gap-y-12 p-0">
          {moments.map(({ entry, photoUrl }) => (
            <li key={entry.id}>
              <Link href={`/m/${entry.shareId}`} className="block text-ink no-underline">
                <PhotoPrint size="sm">
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from storage */}
                  <img src={photoUrl} alt="" className="aspect-[4/5] object-cover" />
                </PhotoPrint>
                <p className="mt-4 font-serif text-[17px] leading-normal">{excerpt(entry.textFinal ?? "", 90)}</p>
                {entry.caption && <p className="mt-1 text-[15px] text-ink-soft">{entry.caption}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-14 max-w-[36em] text-[16px] leading-normal text-ink-soft">{t("booksSoon")}</p>
    </div>
  );
}
