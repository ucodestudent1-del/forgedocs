import { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"
const locales = ["en", "es", "ar", "fr", "de", "ja", "zh"]

const staticPages = [
  "",
  "/about",
  "/pricing",
  "/features",
  "/solutions",
  "/blog",
  "/contact",
  "/help",
  "/faq",
  "/terms",
  "/privacy",
  "/editor",
]

const dashboardPages = [
  "/dashboard",
  "/dashboard/documents",
  "/dashboard/templates",
  "/dashboard/e-signatures",
  "/dashboard/settings",
  "/dashboard/security",
  "/dashboard/notifications",
  "/dashboard/files",
  "/dashboard/billing",
  "/dashboard/conversion",
  "/dashboard/document-generator",
  "/dashboard/pdf-tools",
  "/dashboard/ai-assistant",
  "/dashboard/shared",
  "/dashboard/activity",
  "/dashboard/usage",
  "/dashboard/onboarding",
]

const adminPages = [
  "/dashboard/admin",
  "/dashboard/admin/users",
  "/dashboard/admin/subscriptions",
  "/dashboard/admin/audit-logs",
  "/dashboard/admin/system-health",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = []

  // Static pages for all locales
  for (const locale of locales) {
    for (const page of staticPages) {
      urls.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === "" ? "daily" : "weekly",
        priority: page === "" ? 1 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map(l => [l, `${baseUrl}/${l}${page}`])
          ),
        },
      })
    }
  }

  // Dashboard pages (authenticated)
  for (const locale of locales) {
    for (const page of dashboardPages) {
      urls.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            locales.map(l => [l, `${baseUrl}/${l}${page}`])
          ),
        },
      })
    }
  }

  return urls
}