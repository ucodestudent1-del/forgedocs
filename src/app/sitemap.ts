import { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forgedocs.com"

type StaticPage = {
  url: string
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
}

const staticPages: StaticPage[] = [
  { url: "", changeFrequency: "daily", priority: 1.0 },
  { url: "/about", changeFrequency: "weekly", priority: 0.8 },
  { url: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { url: "/features", changeFrequency: "weekly", priority: 0.9 },
  { url: "/solutions", changeFrequency: "weekly", priority: 0.8 },
  { url: "/blog", changeFrequency: "daily", priority: 0.8 },
  { url: "/contact", changeFrequency: "monthly", priority: 0.7 },
  { url: "/help", changeFrequency: "weekly", priority: 0.7 },
  { url: "/faq", changeFrequency: "weekly", priority: 0.7 },
  { url: "/terms", changeFrequency: "monthly", priority: 0.6 },
  { url: "/privacy", changeFrequency: "monthly", priority: 0.6 },
  { url: "/editor", changeFrequency: "monthly", priority: 0.4 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  return urls
}