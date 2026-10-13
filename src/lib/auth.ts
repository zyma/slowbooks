import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendMail } from "./email";
import { env } from "./env";

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  user: {
    additionalFields: {
      locale: { type: "string", required: false, input: true },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        await sendMail({
          to: email,
          subject: "Your sign-in link for Slow Books",
          text: `Open this link to sign in: ${url}\n\nThe link works for 15 minutes.`,
          html: `<p>Open this link to sign in to Slow Books:</p><p><a href="${url}">${url}</a></p><p>The link works for 15 minutes.</p>`,
        });
      },
    }),
    // Must stay last: lets server actions set cookies.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
