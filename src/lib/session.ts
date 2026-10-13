import { headers } from "next/headers";
import { auth } from "./auth";

/** Reads the current session in server components and route handlers. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
