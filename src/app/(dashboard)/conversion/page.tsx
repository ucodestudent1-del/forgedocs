"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, FileSpreadsheet, FileImage, FilePdf, RefreshCw, Upload, Download, ArrowRight } from "lucide-react"
import { documentRateLimit } from "@/lib/rate-limit"
import { validateCSRF } from "@/lib/csrf"

const CONVERSION_PAIRS = [
  { source: "DOCX", target: "PDF", icon: FileText, color: "bg-blue-500/10 text-blue-600" },
  { source: "PDF", target: "DOCX", icon: FilePdf, color: "bg-red-500/10 text-red-600" },
  { source: "XLSX", target: "CSV", icon: FileSpreadsheet, color: "bg-green-500/10 text-green-600" },
  { source: "CSV", target: "XLSX", icon: FileSpreadsheet, color: "bg-green-500/10 text-green-600" },
  { source: "PPTX", target: "PDF", icon: FileImage, color: "bg-orange-500/10 text-orange-600" },
  { source: "PDF", target: "TXT", icon: FilePdf, color: "bg-red-500/10 text-red-600" },
  { source: "DOCX", target: "TXT", icon: FileText, color: "bg-blue-500/10 text-blue-600" },
  { source: "XLSX", target: "PDF", icon: FileSpreadsheet, color: "bg-green-500/10 text-green-600" },
]

export default function ConversionPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [selectedSourceFile, setSelectedSourceFile] = useState<File | null>(null)
  const [selectedSourceUrl, setSelectedSourceUrl] = useState("")
  const [selectedTargetFormat, setSelectedTargetFormat] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("upload" | "url" | "history")("upload")

  const [sourceFile, setSourceFile] = useState<File | null>(null)

  async function fetchJobs() {
    try {
      const res = await fetch("/api/conversion")
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchJobs()
  }, [])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSourceFile(file)
    setSelectedSourceUrl("")
  }

  async function handleConvert() {
    if (!sourceFile && !selectedSourceUrl) {
      alert("Please select a file or enter a URL")
      return
    }
    if (!selectedTargetFormat) {
      alert("Please select a target format")
      return
    }

    setConverting(true)

    try {
      if (sourceFile) {
        // Upload file first
        const formData = new FormData()
        formData.append("file", sourceFile)

        const uploadRes = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadRes.ok) {
          throw new Error("File upload failed")
        }

        const uploadData = await uploadRes.json()
        const sourceUrl = uploadData.url || uploadData.path

        // Create conversion job
        const res = await fetch("/api/conversion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_url: sourceUrl,
            target_format: selectedTargetFormat,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Conversion failed")
        }

        const data = await res.json()
        setJobs([data.job, ...jobs])
      } else if (selectedSourceUrl) {
        const res = await fetch("/api/conversion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_url: selectedSourceUrl,
            target_format: selectedTargetFormat,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Conversion failed")
        }

        const data = await res.json()
        setJobs([data.job, ...jobs])
      }

      setSourceFile(null)
      setSelectedSourceUrl("")
      setSelectedTargetFormat("")
      setConverting(false)
    } catch (e) {
      console.error(e)
      alert(e.message || "Conversion failed")
      setConverting(false)
    }
  }

  const handleDownload = (url: string) => {
    const a = document.createElement("a")
    a.href = url
    a.download = "converted-document"
    a.click()
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge variant="secondary">Completed</Badge>
      case "processing": return <Badge variant="outline">Processing</Badge>
      case "pending": return <Badge variant="outline">Pending</Badge>
      case "failed": return <Badge variant="destructive">Failed</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Conversion</h1>
          <p className="text-muted-foreground">Convert documents between formats</p>
        </div>
        <Button className="flex items-center gap-2" disabled={converting}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Conversion Form */}
      <Card>
        <CardHeader>
          <CardTitle>Convert Document</CardTitle>
          <CardDescription>Upload a document or provide a URL to convert</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Source Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Source</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => document.getElementById("file-input")?.click()}
                    className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed ${
                      sourceFile ? "bg-blue-50 border-blue-500" : "border-input hover:border-primary/50"
                    }`}
                  >
                    <Upload className="h-5 w-5 mb-2 text-primary" />
                    <span className="text-sm">Upload File</span>
                    <input
                      id="file-input"
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".docx,.pdf,.xlsx,.csv,.pptx,.txt,.html"
                    />
                  </button>
                  <button
                    onClick={() => setSourceFile(null)}
                    className="w-full flex items-center justify-center py-2 rounded-md text-sm text-red-500 hover:bg-red-50"
                    disabled={!sourceFile}
                  >
                    Remove File
                  </button>
                </div>
                {sourceFile && (
                  <div className="mt-2 p-2 rounded-md bg-blue-50 text-sm text-blue-700 border border-blue-100">
                    <FileText className="h-4 w-4 mr-2" />
                    {sourceFile.name} ({Math.round(sourceFile.size / 1024)} KB)
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Or URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/document.pdf"
                  value={selectedSourceUrl}
                  onChange={(e) => {
                    setSelectedSourceUrl(e.target.value)
                    setSourceFile(null)
                  }}
                  className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Target Format */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Target Format</label>
              <div className="grid grid-cols-3 gap-2">
                {CONVERSION_PAIRS.map((pair) => (
                  <button
                    key={`${pair.source}-${pair.target}`}
                    onClick={() => setSelectedTargetFormat(pair.target)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 ${
                      selectedTargetFormat === pair.target
                        ? "bg-blue-50 border-blue-500 text-blue-600"
                        : "border-input hover:border-primary/50"
                    }`}
                  >
                    <pair.icon className={`h-5 w-5 ${pair.color}`} />
                    <span className="text-xs font-medium">{pair.source} → {pair.target}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Convert Button */}
            <Button
              onClick={handleConvert}
              disabled={!sourceFile && !selectedSourceUrl || !selectedTargetFormat || converting}
              className="w-full"
              size="lg"
            >
              {converting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Converting...
                </>
                : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Convert Document
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Jobs</CardTitle>
          <div className="flex items-center gap-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <div className="bg-muted px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex">
                <div className="w-1/3">Source</div>
                <div className="w-1/3">Target</div>
                <div className="w-1/3">Status</div>
              </div>
            </div>
            <div className="divide-y">
              {loading ? (
                <div className="p-4 animate-pulse rounded-lg bg-card">
                  <div className="h-4 bg-muted w-1/2 rounded mb-2" />
                  <div className="h-4 bg-muted w-1/3 rounded" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No conversion jobs yet</p>
                </div>
              ) : (
                jobs.filter((job) =>
                  (job.source_url || "").toLowerCase().includes(search.toLowerCase()) ||
                  job.target_format.toLowerCase().includes(search.toLowerCase()) ||
                  job.status.toLowerCase().includes(search.toLowerCase())
                ).map((job) => (
                  <div key={job.id} className="flex items-center justify-between px-3 py-2 text-sm border-b">
                    <div className="flex items-center gap-3 w-1/3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{job.source_url?.split("/").pop() || "document"}</span>
                    </div>
                    <div className="w-1/3 text-muted-foreground">{job.target_format?.toUpperCase()}</div>
                    <div className="w-1/3 text-right">
                      <Badge variant={job.status === "completed" ? "secondary" : job.status === "failed" ? "destructive" : "outline"}>
                        {job.status}
                      </Badge>
                    </div>
                    {job.status === "completed" && (
                      <button
                        onClick={() => handleDownload(`/api/documents/${job.id}/export`)}
                        className="ml-4 text-sm text-primary hover:underline"
                      >
                        Download
                      </button>
                    )}
                  </div>
                ))}
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { Search } from "lucide-react"
