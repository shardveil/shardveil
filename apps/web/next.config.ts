import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",

  // Next dev/Turbopack needs unsafe-eval. Avoid unsafe-eval in production.
  `script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval'" : "'unsafe-inline'"}`,

  // Required because Next/dev overlay/goober/toast libs inject styles.
  "style-src 'self' 'unsafe-inline'",

  // Required for Next Image, IPFS gateways, SVG/data/blob previews.
  "img-src 'self' data: blob: https://gateway.pinata.cloud https://ipfs.io https://cdn.shardveil.io",

  "font-src 'self' data:",

  // Required for RPC, WalletConnect/Reown, APIs, HMR/websocket.
  `connect-src 'self' ${isDev ? "http://localhost:* http://127.0.0.1:*" : ""} https: ws: wss:`,

  // Required for wallet modal / verification / embedded wallet frames.
  "frame-src 'self' https:",

  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

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
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
