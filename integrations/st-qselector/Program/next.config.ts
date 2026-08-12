import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/st-qselector",
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
