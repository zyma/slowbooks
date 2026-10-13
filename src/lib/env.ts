import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(16),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("Slow Books <hello@slowbooks.local>"),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  DEEPGRAM_API_KEY: z.string().optional().default(""),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
});

/**
 * `next build` imports server modules to collect page data, but real secrets
 * only exist at runtime (Docker image is built in CI). During the build phase
 * missing values fall back to placeholders; nothing connects with them.
 */
const isBuild = process.env.NEXT_PHASE === "phase-production-build";
const buildPlaceholders = {
  DATABASE_URL: "postgres://build@localhost:5432/build",
  BETTER_AUTH_SECRET: "build_placeholder_4f9c2a7e1b8d6035e9a1c7f2b4d8e6a0",
  S3_ENDPOINT: "http://localhost:9000",
  S3_BUCKET: "build",
  S3_ACCESS_KEY_ID: "build",
  S3_SECRET_ACCESS_KEY: "build",
};

/** Server-side env, validated once at first import. */
export const env = schema.parse(isBuild ? { ...buildPlaceholders, ...process.env } : process.env);
