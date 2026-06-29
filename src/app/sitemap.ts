import { supabaseAdmin } from "@/lib/serverAuth";
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://askmynotes.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/pyqs`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];

  // Fetch all PYQ slugs in batches
  const pyqRoutes: MetadataRoute.Sitemap = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("pyqs")
      .select("slug,updated_at,exam_year")
      .order("exam_year", { ascending: false })
      .range(from, from + batchSize - 1);

    if (error || !data || data.length === 0) break;

    for (const row of data) {
      pyqRoutes.push({
        url: `${BASE_URL}/pyqs/${row.slug}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    if (data.length < batchSize) break;
    from += batchSize;
  }

  return [...staticRoutes, ...pyqRoutes];
}