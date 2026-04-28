import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Images from external sources (if any) can be added here
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
