import type { NextConfig } from "next";

const isStaticExport = process.env.CAPACITOR_EXPORT === "true";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
