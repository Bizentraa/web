import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@bizentra/contracts", "@bizentra/design-system"],
};

export default nextConfig;
