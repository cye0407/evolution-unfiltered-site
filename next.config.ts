import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "evolutionunfiltered.com",
      },
    ],
  },
};

export default nextConfig;
