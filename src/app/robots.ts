import { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/auth/",
        "/editor/",
        "/reader/",
        "/_next/",
        "/_vercel/",
        "/_next/static/",
        "/_next/image",
      ],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"}/sitemap.xml`,
    host: "forgedocs.com",
  }
}