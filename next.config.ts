import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["sharp", "satori", "pg-boss", "postgres"],
  // Share images read their fonts from disk at runtime: ship them with the standalone build.
  outputFileTracingIncludes: {
    "/api/moments/*/*": ["./src/assets/fonts/*.ttf"],
    "/*/m/*/opengraph-image": ["./src/assets/fonts/*.ttf"],
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default withNextIntl(nextConfig);
