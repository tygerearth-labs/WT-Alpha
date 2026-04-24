import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // X-Frame-Options: allow embedding in iframes (preview panels, etc.)
  // {
  //   key: "X-Frame-Options",
  //   value: "DENY",
  // },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "preview-chat-cbfcbd9b-5c49-4c8f-a37a-c6809d64ae6a.space.z.ai",
  ],
  // Vercel: uses default serverless output
  // Local production: uncomment next line for standalone output
  // output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
