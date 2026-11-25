import { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"
const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production"

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
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl.replace(/^https?:\/\//, ""),
    ...(!isProduction && {
      rules: {
        userAgent: "*",
        disallow: ["/"],
      },
    }),
  }
}