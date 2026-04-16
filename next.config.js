/** @type {import('next').NextConfig} */

// Extract Supabase domain if env is available (for next/image)
const supabaseHost = process.env.SUPABASE_URL
  ? new URL(process.env.SUPABASE_URL).hostname
  : null;

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      ...(supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : []),
      // Add any custom CDN domain here, e.g.:
      // { protocol: "https", hostname: "cdn.bio-hacked.co.za" },
    ],
  },
  async headers() {
    // In prod, lock CORS down to your own origin; in dev allow anything
    const isDev = process.env.NODE_ENV !== "production";
    const origin = isDev ? "*" : (process.env.NEXT_PUBLIC_APP_URL || "*");
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: origin },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
