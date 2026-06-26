import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["pdf-parse"],

  // Performance: compress responses
  compress: true,

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
        ],
      },
      {
        // Cache static assets aggressively
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // /coach was never built; the AI surface is Sage. Repoint stale links there.
      { source: "/ai-coach", destination: "/sage", permanent: true },
      { source: "/aicoach",  destination: "/sage", permanent: true },
      // Sage rename (redesign Stage 4): permanent redirect so old links/bookmarks survive.
      // NOTE: /api/ask-ai (the non-streaming Q&A API) is intentionally NOT renamed.
      { source: "/ask-ai", destination: "/sage", permanent: true },
      // /chat is superseded by /sage (orphaned, no inbound links). Redirect so any
      // old URL resolves to the live chat surface instead of a dead/broken route.
      { source: "/chat", destination: "/sage", permanent: true },
    ];
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT || "ask-my-notes",
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
});
