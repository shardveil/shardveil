import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@shardveil/shared", "@shardveil/contracts"],

  experimental: {
    optimizePackageImports: ["lucide-react", "motion", "recharts"],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.shardveil.io",
        pathname: "/**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            // TODO(Module 21): tighten before production
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src *;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
