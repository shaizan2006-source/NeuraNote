export async function GET() {
  const base = "https://askmynotes.in";
  const pages = [
    { url: "/",        priority: "1.0", changefreq: "weekly" },
    { url: "/pricing", priority: "0.9", changefreq: "monthly" },
    { url: "/login",   priority: "0.8", changefreq: "yearly" },
    { url: "/signup",  priority: "0.8", changefreq: "yearly" },
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url>
    <loc>${base}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
}
