import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const bookLanguage = pgEnum("book_language", ["ru", "en", "es", "de"]);
export const bookStatus = pgEnum("book_status", ["collecting", "editing", "ready"]);
export const entryStatus = pgEnum("entry_status", [
  "uploaded",
  "transcribing",
  "polishing",
  "ready",
  "failed",
]);
export const editMode = pgEnum("edit_mode", ["light", "literary"]);
export const assetKind = pgEnum("asset_kind", ["photo", "audio"]);
export const printQuality = pgEnum("print_quality", ["unknown", "good", "low"]);
export const renderStatus = pgEnum("render_status", ["queued", "rendering", "done", "failed"]);
export const orderStatus = pgEnum("order_status", ["draft", "submitted", "paid", "printed", "shipped", "cancelled"]);

/**
 * Layout of the book. Entries are content, spreads are arrangement.
 * The editor rewrites this array; the renderer only reads it.
 */
export type Spread =
  | { type: "cover"; assetId?: string }
  | { type: "title" }
  | { type: "story"; entryId: string; layout: "photo-left" | "photo-right" | "photo-full" }
  | { type: "blank" };

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: assetKind("kind").notNull(),
    storageKey: text("storage_key").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes"),
    width: integer("width"),
    height: integer("height"),
    durationSec: real("duration_sec"),
    printQuality: printQuality("print_quality").notNull().default("unknown"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("assets_user_id_idx").on(t.userId)],
);

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title"),
    subtitle: text("subtitle"),
    language: bookLanguage("language").notNull().default("en"),
    /** Print format id, e.g. "square-21". Comes from the print provider catalog. */
    format: text("format").notNull().default("square-21"),
    theme: text("theme").notNull().default("linen"),
    status: bookStatus("status").notNull().default("collecting"),
    /** What the user told us on the landing page: who the book is for, tone. */
    brief: text("brief"),
    coverAssetId: uuid("cover_asset_id").references(() => assets.id, { onDelete: "set null" }),
    spreads: jsonb("spreads").$type<Spread[]>().notNull().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("books_user_id_idx").on(t.userId)],
);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    photoAssetId: uuid("photo_asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    audioAssetId: uuid("audio_asset_id").references(() => assets.id, { onDelete: "set null" }),
    transcriptRaw: text("transcript_raw"),
    transcriptClean: text("transcript_clean"),
    /** Text after the user's own edits. Null means "use transcriptClean". */
    textFinal: text("text_final"),
    editMode: editMode("edit_mode").notNull().default("light"),
    detectedLanguage: text("detected_language"),
    status: entryStatus("status").notNull().default("uploaded"),
    error: text("error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("entries_book_id_idx").on(t.bookId)],
);

export const renders = pgTable("renders", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookId: uuid("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  storageKey: text("storage_key"),
  status: renderStatus("status").notNull().default("queued"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Placeholder for monetization. Not used at launch. */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookId: uuid("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "restrict" }),
  renderId: uuid("render_id").references(() => renders.id, { onDelete: "set null" }),
  provider: text("provider").notNull().default("peecho"),
  externalId: text("external_id"),
  status: orderStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
