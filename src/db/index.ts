import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

/**
 * The database is a managed Postgres outside this stack.
 * SSL is taken from the URL (?sslmode=require). Keep the pool small: serverless
 * and managed providers count connections per instance.
 */
const client =
  globalForDb.pgClient ??
  postgres(env.DATABASE_URL, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
