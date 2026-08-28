import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@bizentra/api-client",
    "@bizentra/contracts",
    "@bizentra/design-system",
    "@bizentra/themes",
  ],
};

export default nextConfig;
