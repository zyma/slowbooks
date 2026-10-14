import { headers } from "next/headers";
import { auth } from "./auth";

/** Reads the current session in server components and route handlers. Guests have one too. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Session of a person with a real account. Guests (anonymous plugin) get null. */
export async function getMemberSession() {
  const session = await getSession();
  return session && !session.user.isAnonymous ? session : null;
}
