import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { sanitizeForExport } from "@/lib/sanitize"
import { documentRateLimit } from "@/lib/rate-limiter"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const GET = withErrorBoundary(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { id } = await params
  const url = new URL(req.url)
  const format = url.searchParams.get("format") || "html"

  const { data: doc, error } = await supabase
    .from("documents")
    .select("content, title, mime_type, version")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !doc) {
    throw createAppError("Document not found", 404, "NOT_FOUND")
  }

  // Sanitize filename to prevent header injection
  const safeTitle = (doc.title || "document").replace(/["\r\n]/g, "_").slice(0, 100)

  // HTML-escape the title to prevent stored XSS when it is interpolated into exported HTML
  const escapeHtml = (str: string): string =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
  const safeTitleHtml = escapeHtml(safeTitle)

  // Sanitize content for export
  const sanitizedContent = sanitizeForExport(doc.content || "")

  // Convert to requested format
  let exportContent = sanitizedContent
  let mimeType = "text/html"
  let extension = "html"

  switch (format) {
    case "html":
      exportContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitleHtml}</title></head><body>${sanitizedContent}</body></html>`
      mimeType = "text/html"
      extension = "html"
      break
    case "md":
      exportContent = htmlToMarkdown(sanitizedContent)
      mimeType = "text/markdown"
      extension = "md"
      break
    case "txt":
      exportContent = stripHtml(sanitizedContent)
      mimeType = "text/plain"
      extension = "txt"
      break
    case "docx":
      exportContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitleHtml}</title></head><body>${sanitizedContent}</body></html>`
      mimeType = "text/html"
      extension = "html"
      break
    case "pdf":
      exportContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitleHtml}</title></head><body>${sanitizedContent}</body></html>`
      mimeType = "text/html"
      extension = "html"
      break
    default:
      exportContent = sanitizedContent
      mimeType = "text/html"
      extension = "html"
  }

  return new NextResponse(exportContent, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${safeTitle}.${extension}"`,
    },
  })
})

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n")
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n")
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
    .replace(/<u[^>]*>(.*?)<\/u>/gi, "__$1__")
    .replace(/<s[^>]*>(.*?)<\/s>/gi, "~~$1~~")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, "```\n$1\n```\n\n")
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "> $1\n\n")
    .replace(/<ul[^>]*>(.*?)<\/ul>/gi, (_, content) => content.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n") + "\n")
    .replace(/<ol[^>]*>(.*?)<\/ol>/gi, (_, content) => {
      let i = 1
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${i++}. $1\n`) + "\n"
    })
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, "![Image]($1)")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
