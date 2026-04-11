export async function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /onboarding

Sitemap: https://askmynotes.in/sitemap.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
}
