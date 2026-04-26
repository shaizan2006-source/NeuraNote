/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["pdf-parse"],
  async redirects() {
    return [
      { source: "/ai-coach", destination: "/coach", permanent: true },
      { source: "/aicoach",  destination: "/coach", permanent: true },
    ];
  },
};

export default nextConfig;
