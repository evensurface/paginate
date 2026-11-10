import type { MetadataRoute } from "next";
import { siteBaseUrl, toAbsoluteUrl } from "@/lib/metadata";
import { source } from "@/lib/source";

export const dynamic = "force-static";
export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  const docsPages = source
    .getPages()
    .map((page) => ({
      url: toAbsoluteUrl(page.url),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: page.url === "/docs" ? 0.9 : 0.7,
    }))
    .sort((first, second) => first.url.localeCompare(second.url));

  return [
    {
      url: siteBaseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...docsPages,
  ];
}
