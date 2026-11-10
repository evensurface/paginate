import type { MetadataRoute } from "next";
import { siteBaseUrl, toAbsoluteUrl } from "@/lib/metadata";

export const dynamic = "force-static";
export const revalidate = false;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    host: siteBaseUrl,
    sitemap: toAbsoluteUrl("/sitemap.xml"),
  };
}
