import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authConfig: "./src/auth.ts",
  },
};

export default nextConfig;
