import { desc, eq } from "drizzle-orm";
import { resolveLocale } from "@/i18n/locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { books } from "@/db/schema";
import { SignOutButton } from "@/components/SignOutButton";
import { getSession } from "@/lib/session";

export default async function BooksPage(props: PageProps<"/[locale]/app">) {
  const locale = await resolveLocale(props.params);
  setRequestLocale(locale);
  const t = await getTranslations("App");
  const session = (await getSession())!;

  const list = await db
    .select()
    .from(books)
    .where(eq(books.userId, session.user.id))
    .orderBy(desc(books.updatedAt));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl">{t("title")}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-ink-soft">{session.user.email}</span>
          <SignOutButton />
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-8 text-ink-soft">{t("empty")}</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {list.map((b) => (
            <li key={b.id} className="border border-line rounded-lg p-4 bg-paper-deep/40">
              <h2 className="text-xl">{b.title ?? t("untitled")}</h2>
              <p className="text-sm text-ink-soft mt-1">{t(`status.${b.status}`)}</p>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled
        title="Stage 2"
        className="mt-10 bg-accent text-paper px-5 py-2.5 rounded-md opacity-50 cursor-not-allowed"
      >
        {t("newBook")}
      </button>
    </div>
  );
}
