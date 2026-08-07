import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // AI photo import sends a compressed image as a server action argument;
    // the default 1MB cap is too small for a base64-encoded photo.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
