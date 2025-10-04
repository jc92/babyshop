import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

if (isDev && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  const keylessPath = path.join(process.cwd(), ".clerk", ".tmp", "keyless.json");

  if (fs.existsSync(keylessPath)) {
    try {
      const raw = fs.readFileSync(keylessPath, "utf8");
      const credentials = JSON.parse(raw) as {
        publishableKey?: string;
        secretKey?: string;
      };

      if (credentials.publishableKey?.trim()) {
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = credentials.publishableKey.trim();
      }

      if (!process.env.CLERK_SECRET_KEY && credentials.secretKey?.trim()) {
        process.env.CLERK_SECRET_KEY = credentials.secretKey.trim();
      }
    } catch (error) {
      console.warn("Unable to load Clerk keyless credentials:", error);
    }
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
} satisfies NextConfig;

let withBundleAnalyzer: (config: NextConfig) => NextConfig = (config) => config;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bundleAnalyzer = require("@next/bundle-analyzer");
  withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });
} catch {
  if (process.env.ANALYZE === "true") {
    console.warn(
      "@next/bundle-analyzer not installed. Run `pnpm add -D @next/bundle-analyzer` to enable analysis.",
    );
  }
}

export default withBundleAnalyzer(nextConfig);
