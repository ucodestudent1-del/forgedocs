import DOMPurify from "dompurify"
import { JSDOM } from "jsdom"

const window = new JSDOM("").window
const purify = DOMPurify(window)

export const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span",
  "hr",
]

export const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "target", "rel",
  "class", "id", "style",
  "width", "height", "align",
  "colspan", "rowspan",
]

export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "select", "textarea"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"],
  })
}

export function sanitizeForExport(content: string): string {
  // For export, we keep more tags but still sanitize
  return purify.sanitize(content, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "sub", "sup",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span", "hr",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "target", "rel",
      "class", "id", "style",
      "width", "height", "align",
      "colspan", "rowspan",
    ],
  })
}