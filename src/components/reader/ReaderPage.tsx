"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, RotateCcw, X } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface InlineSegment {
  type: "text" | "bold" | "italic" | "code" | "link"
  content: string
  href?: string
}

function tokenizeInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = []
  let remaining = text

  const linkRe = /\[([^\]]*)\]\(([^)]*)\)/
  const boldRe = /\*\*([^*]+)\*\*/
  const italicRe = /\*([^*]+)\*/
  const codeRe = /`([^`]+)`/

  while (remaining.length) {
    const matches: { re: RegExp; index: number; type: InlineSegment["type"] }[] = []

    const linkMatch = remaining.match(linkRe)
    if (linkMatch) matches.push({ re: linkRe, index: linkMatch.index!, type: "link" })

    const boldMatch = remaining.match(boldRe)
    if (boldMatch) matches.push({ re: boldRe, index: boldMatch.index!, type: "bold" })

    const italicMatch = remaining.match(italicRe)
    if (italicMatch) matches.push({ re: italicRe, index: italicMatch.index!, type: "italic" })

    const codeMatch = remaining.match(codeRe)
    if (codeMatch) matches.push({ re: codeRe, index: codeMatch.index!, type: "code" })

    if (matches.length === 0) {
      segments.push({ type: "text", content: remaining })
      break
    }

    matches.sort((a, b) => a.index - b.index)
    const first = matches[0]

    if (first.index > 0) {
      segments.push({ type: "text", content: remaining.slice(0, first.index) })
    }

    const match = remaining.match(first.re)!
    if (first.type === "link") {
      segments.push({ type: "link", content: match[1], href: match[2] })
    } else {
      segments.push({ type: first.type, content: match[1] })
    }

    remaining = remaining.slice(match.index! + match[0].length)
  }

  return segments
}

function renderInline(text: string): React.ReactNode {
  return (
    <span className="prose-inline leading-relaxed">
      {tokenizeInline(text).map((seg, i) => {
        switch (seg.type) {
          case "bold":
            return <strong key={i}>{seg.content}</strong>
          case "italic":
            return <em key={i}>{seg.content}</em>
          case "code":
            return <code key={i}>{seg.content}</code>
          case "link":
            return (
              <a
                key={i}
                href={seg.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:underline"
              >
                {seg.content}
              </a>
            )
          default:
            return seg.content
        }
      })}
    </span>
  )
}

function renderBlock(block: string, i: number): React.ReactNode {
  const trimmed = block.trim()
  if (!trimmed) return null

  // Heading
  const hMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
  if (hMatch) {
    const level = hMatch[1].length
    const Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" =
      level === 1 ? "h1" : level === 2 ? "h2" : level === 3 ? "h3" : level === 4 ? "h4" : level === 5 ? "h5" : "h6"
    return (
      <Tag
        key={i}
        className={`font-semibold tracking-tight mb-3 mt-6 ${level === 1 ? "text-3xl" : level === 2 ? "text-2xl" : level === 3 ? "text-xl" : "text-lg"}`}
      >
        {renderInline(hMatch[2])}
      </Tag>
    )
  }

  // Thematic break
  if (/^(\*\*\*|---|___)\s*$/.test(trimmed)) {
    return <hr key={i} className="my-8 border-border" />
  }

  // Blockquote
  if (trimmed.startsWith("> ")) {
    return (
      <blockquote key={i} className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground">
        {renderInline(trimmed.slice(2))}
      </blockquote>
    )
  }

  // Ordered list (single line)
  const olMatch = trimmed.match(/^(\d+)\.\s(.*)$/)
  if (olMatch) {
    return (
      <ol key={i} className="list-decimal pl-6 my-3 space-y-1">
        <li className="leading-relaxed">{renderInline(olMatch[2])}</li>
      </ol>
    )
  }

  // Unordered list block
  if (/^([\-*])\s/m.test(trimmed)) {
    const items = trimmed.split("\n").map((line) => line.replace(/^[\-*]\s/, "").trim()).filter(Boolean)
    return (
      <ul key={i} className="list-disc pl-6 my-3 space-y-1">
        {items.map((item, j) => (
          <li key={j} className="leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    )
  }

  // Code block
  if (trimmed.startsWith("```")) {
    const inner = trimmed.replace(/^```[\s\S]*?\n/, "").replace(/```\s*$/, "")
    return (
      <pre key={i} className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono my-4">
        {inner}
      </pre>
    )
  }

  // Paragraph
  return (
    <p key={i} className="my-4 leading-relaxed">
      {renderInline(trimmed)}
    </p>
  )
}

interface ReaderPageProps {
  document: any
}

export default function ReaderPage({ document }: ReaderPageProps) {
  const [content, setContent] = useState(document?.content || "")
  const [copied, setCopied] = useState(false)

  const plainText = content
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .trim()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Reader-only toolbar: no site nav, no sidebar, no footer chrome */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-background/50 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">{document?.title || "Untitled"}</h1>
            <p className="text-xs text-muted-foreground">
              {document?.version ? `v${document.version}` : ""}
              {document?.updated_at && ` · ${formatDate(document.updated_at)}`}
              {document?.mime_type && ` · ${document.mime_type.split("/").pop()?.toUpperCase()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!content}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 21H4a2 2 0 0 1-2-2v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 1-2-2h-2" /><polyline points="6 9 16 9" /></svg>
            Print
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(plainText)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" asChild>
            <a href={`/editor?id=${document?.id}`} className="text-xs text-primary hover:underline">
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 3H4v16h16V8l-6-6m0 0L3 17m0 0l6-6" /></svg>
              Edit document
            </a>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => window.history.back()}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="19" y1="5" x2="5" y2="19" /><polyline points="2 11 6 19 10 11" /></svg>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-10 overflow-y-auto">
        {document?.error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="h-16 w-16 mb-3 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            <h2 className="text-xl font-semibold text-foreground mb-2">Document not found</h2>
            <p className="text-muted-foreground">{document.error}</p>
          </div>
        ) : !content ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="h-16 w-16 mb-3 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            <h2 className="text-xl font-semibold text-foreground mb-2">No content</h2>
            <p className="text-muted-foreground">This document is empty.</p>
          </div>
        ) : (
          <>
            <Badge variant="outline" className="mb-6">
              {document?.mime_type?.split("/").pop()?.toUpperCase() || "DOC"}
            </Badge>
            <div className="prose prose-lg max-w-none text-foreground">
              {content.split(/\n(?=\n)/).map((block: string, i: number) => renderBlock(block, i))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
