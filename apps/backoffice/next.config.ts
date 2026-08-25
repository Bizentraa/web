import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@bizentra/api-client", "@bizentra/contracts", "@bizentra/design-system"],
};

export default nextConfig;
