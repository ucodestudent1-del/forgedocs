"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, File, FileSpreadsheet, Search, Upload, Download } from "lucide-react"

const CONVERSIONS = [
  { source: "DOCX", target: "PDF", icon: File },
  { source: "PDF", target: "DOCX", icon: File },
  { source: "XLSX", target: "CSV", icon: FileSpreadsheet },
  { source: "CSV", target: "XLSX", icon: FileSpreadsheet },
  { source: "PPTX", target: "PDF", icon: File },
]

export default function ConversionPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)

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

  async function handleConvert(source: string, target: string) {
    setConverting(true)
    try {
      const res = await fetch("/api/conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: "", target_format: target }),
      })
      if (res.ok) {
        const data = await res.json()
        setJobs([data.job, ...(jobs || [])])
      } else {
        const err = await res.json()
        alert(err.error || "Conversion failed")
      }
    } catch (e) {
      console.error(e)
      alert("Conversion failed")
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conversion</h1>
          <p className="text-muted-foreground">Convert documents between formats</p>
        </div>
        <Button className="flex items-center gap-2" disabled={converting}>
          <Upload className="h-4 w-4" />
          Upload & Convert
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {CONVERSIONS.map((c) => (
          <Card key={`${c.source}-${c.target}`} className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground">{c.source} → {c.target}</span>
                  <span className="text-xs text-muted-foreground">Convert document</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button size="sm" className="w-full" onClick={() => handleConvert(c.source, c.target)} disabled={converting}>
                Convert
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversion Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full"
            />
          </div>
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
                  <p>No conversion jobs</p>
                </div>
              ) : (
                jobs.filter((job) =>
                  (job.source_url || "").toLowerCase().includes(search.toLowerCase()) ||
                  job.target_format.toLowerCase().includes(search.toLowerCase()) ||
                  job.status.toLowerCase().includes(search.toLowerCase())
                ).map((job) => (
                  <div key={job.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-3 w-1/3">
                      <File className="h-4 w-4 text-muted-foreground" />
                      <span>{job.source_url?.split("/").pop() || "document"}</span>
                    </div>
                    <div className="w-1/3 text-muted-foreground">{job.target_format.toUpperCase()}</div>
                    <div className="w-1/3">
                      <Badge variant={job.status === "completed" ? "secondary" : job.status === "failed" ? "destructive" : "default"}>
                        {job.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
