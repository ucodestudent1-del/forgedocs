"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "@/lib/i18n"
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  RefreshCw,
  Upload,
  Download,
  ArrowRight,
  Search,
  Settings,
  BarChart3,
  Layout,
  ArrowLeftRight,
} from "lucide-react"
import { documentRateLimit } from "@/lib/rate-limiter"
import { validateCSRF } from "@/lib/csrf"
import { useToast } from "@/components/ui/use-toast"
import {
  getUnitsForCategory,
  getCategories,
  getUnitLabel,
  convertUnit,
  UNIT_CATEGORIES,
  UNIT_DEFINITIONS,
  getCategories as getUnitCategories,
  getUnitsForCategory as getUnits,
  UNIT_LABELS,
  convertCurrency,
  getSupportedCurrencies,
} from "@/lib/unit-converter"

type Tab = "document" | "unit" | "metadata"

const DOCUMENT_PAIRS = [
  { source: "DOCX", target: "PDF", icon: FileText, color: "bg-primary/10 text-primary" },
  { source: "PDF", target: "DOCX", icon: FileText, color: "bg-primary/10 text-primary" },
  { source: "XLSX", target: "CSV", icon: FileSpreadsheet, color: "bg-primary/10 text-primary" },
  { source: "CSV", target: "XLSX", icon: FileSpreadsheet, color: "bg-primary/10 text-primary" },
  { source: "PPTX", target: "PDF", icon: FileImage, color: "bg-primary/10 text-primary" },
  { source: "PDF", target: "TXT", icon: FileText, color: "bg-primary/10 text-primary" },
  { source: "DOCX", target: "TXT", icon: FileText, color: "bg-primary/10 text-primary" },
  { source: "XLSX", target: "PDF", icon: FileSpreadsheet, color: "bg-primary/10 text-primary" },
]

export default function ConversionPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("document")
  const { toast } = useToast()

  // Document tab state
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [selectedSourceUrl, setSelectedSourceUrl] = useState("")
  const [selectedTargetFormat, setSelectedTargetFormat] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [search])
  const t = useTranslations(["conversion", "common", "errors"])

  // Unit tab state
  const [unitCategory, setUnitCategory] = useState<string | null>(() => getCategories()[0]?.id || null)
  const [unitFrom, setUnitFrom] = useState("")
  const [unitTo, setUnitTo] = useState("")
  const [unitValue, setUnitValue] = useState("")

  // Auto-select first category on mount
  useEffect(() => {
    if (!unitCategory) {
      const categories = getCategories()
      if (categories.length > 0) {
        const first = categories[0]
        setUnitCategory(first.id)
      }
    }
  }, [])

  // Metadata tab state
  const [metaSourceFormat, setMetaSourceFormat] = useState("json")
  const [metaTargetFormat, setMetaTargetFormat] = useState("yaml")
  const [metaValue, setMetaValue] = useState(JSON.stringify({ name: "Example", version: 1 }, null, 2))
  const [metaResult, setMetaResult] = useState("")

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/conversion")
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  // ---- Document handlers ----
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSourceFile(file)
    setSelectedSourceUrl("")
  }

  async function handleConvert() {
    if (activeTab === "document") {
      await handleDocumentConvert()
    } else if (activeTab === "unit") {
      await handleUnitConvert()
    } else if (activeTab === "metadata") {
      await handleMetadataConvert()
    }
  }

  async function handleDocumentConvert() {
    if (!sourceFile && !selectedSourceUrl) {
      toast({ title: "Please select a file or enter a URL", variant: "destructive" })
      return
    }
    if (!selectedTargetFormat) {
      toast({ title: "Please select a target format", variant: "destructive" })
      return
    }
    setConverting(true)
    try {
      if (sourceFile) {
        const formData = new FormData()
        formData.append("file", sourceFile)
        const uploadRes = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        })
        if (!uploadRes.ok) throw new Error("File upload failed")
        const uploadData = await uploadRes.json()
        const sourceUrl = uploadData.url || uploadData.path
        const res = await fetch("/api/conversion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "document",
            source_format: sourceFile.name.split(".").pop() || "txt",
            target_format: selectedTargetFormat,
            source_url: sourceUrl,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Conversion failed")
        }
        const data = await res.json()
        setJobs([data.job, ...jobs])
      } else if (selectedSourceUrl) {
        const ext = selectedSourceUrl.split(".").pop() || "txt"
        const res = await fetch("/api/conversion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "document",
            source_format: ext,
            target_format: selectedTargetFormat,
            source_url: selectedSourceUrl,
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
      toast({ title: t("conversionFailed"), variant: "destructive" })
      setConverting(false)
    }
  }

  async function handleUnitConvert() {
    if (!unitCategory || !unitFrom || !unitTo || !unitValue) {
      toast({ title: t("errors.validationError"), variant: "destructive" })
      return
    }
    setConverting(true)
    try {
      const value = parseFloat(unitValue)
      if (isNaN(value)) {
        toast({ title: "Please enter a valid number", variant: "destructive" })
        return
      }
      
      let result: number
      if (unitCategory === "currency") {
        const result = await convertCurrency(value, unitFrom, unitTo)
        toast({ title: `${unitValue} ${unitFrom} = ${result.result.toFixed(4)} ${unitTo}`, variant: "success" })
      } else {
        result = convertUnit(value, unitFrom, unitTo, unitCategory)
        toast({ title: `${unitValue} ${UNIT_LABELS[unitFrom] || unitFrom} = ${result.toFixed(4)} ${UNIT_LABELS[unitTo] || unitTo}`, variant: "success" })
      }
    } catch (e) {
      console.error(e)
      toast({ title: t("conversionFailed"), variant: "destructive" })
    } finally {
      setConverting(false)
    }
  }

  async function handleMetadataConvert() {
    setConverting(true)
    try {
      const res = await fetch("/api/conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "metadata",
          source_format: metaSourceFormat,
          target_format: metaTargetFormat,
          value: metaValue,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Metadata conversion failed")
      }
      const data = await res.json()
      setMetaResult(data.output)
    } catch (e) {
      console.error(e)
      toast({ title: t("conversionFailed"), variant: "destructive" })
    } finally {
      setConverting(false)
    }
  }

  const handleDownload = async (url: string, targetFormat?: string) => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error("Download failed")
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition")
      let filename = `converted-document`
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (match) filename = match[1].replace(/['"]/g, "")
      }
      if (targetFormat && !filename.includes(".")) {
        filename += `.${targetFormat.toLowerCase()}`
      }
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch (e) {
      console.error(e)
      toast({ title: "Download failed", variant: "destructive" })
    }
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
    <div className="space-y-6 overflow-y-auto min-h-[calc(100vh-200px)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Universal Converter</h1>
          <p className="text-muted-foreground">Convert documents, units, and metadata across formats</p>
        </div>
        <Button className="flex items-center gap-2" disabled={converting} onClick={fetchJobs}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-input" role="tablist">
        {[
          { key: "document" as Tab, label: "Document" },
          { key: "unit" as Tab, label: "Unit" },
          { key: "metadata" as Tab, label: "Metadata" },
        ].map((tab) => (
          <button
            key={tab.key}
            role="tab"
            onClick={() => setActiveTab(tab.key)}
            aria-selected={activeTab === tab.key}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Document Converter Tab */}
      {activeTab === "document" && (
        <Card>
          <CardHeader>
            <CardTitle>Document Conversion</CardTitle>
            <CardDescription>Convert documents between formats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">Source</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => document.getElementById("file-input")?.click()}
                      className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed ${
                        sourceFile ? "bg-primary/10 border-primary" : "border-input hover:border-primary/50"
                      }`}
                    >
                      <Upload className="h-5 w-5 mb-2 text-primary" />
                      <span className="text-sm">Upload File</span>
                      <input
                        id="file-input"
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".docx,.pdf,.xlsx,.csv,.pptx,.txt,.html,.md,.epub,.jpg,.png,.webp,.svg,.tiff,.bmp,.gif,.odt,.ods,.odp,.rtf"
                      />
                    </button>
                    <Button variant="outline" onClick={() => setSourceFile(null)} className="w-full" disabled={!sourceFile}>
                      Remove File
                    </Button>
                  </div>
                  {sourceFile && (
                    <div className="mt-2 p-2 rounded-md bg-primary/50 text-sm text-primary border border-primary/20">
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

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Target Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {DOCUMENT_PAIRS.map((pair) => (
                    <button
                      key={`${pair.source}-${pair.target}`}
                      onClick={() => setSelectedTargetFormat(pair.target)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 ${
                        selectedTargetFormat === pair.target
                          ? "bg-primary/10 border-primary text-primary"
                          : "border-input hover:border-primary/50"
                      }`}
                    >
                      <pair.icon className={`h-5 w-5 ${pair.color}`} />
                      <span className="text-xs font-medium">{pair.source} → {pair.target}</span>
                    </button>
                  ))}
                </div>
              </div>

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
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Convert Document
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unit Converter Tab */}
      {activeTab === "unit" && (
        <Card>
          <CardHeader>
            <CardTitle>Unit Conversion</CardTitle>
            <CardDescription>Convert between measurement units</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <div className="flex flex-wrap gap-2">
                  {getCategories().map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setUnitCategory(cat.id)
                        setUnitFrom("")
                        setUnitTo("")
                      }}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        unitCategory === cat.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-input bg-background text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                  {/* Currency category */}
                  <button
                    key="currency"
                    onClick={() => {
                      setUnitCategory("currency")
                      setUnitFrom("")
                      setUnitTo("")
                    }}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                      unitCategory === "currency"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    Currency
                  </button>
                </div>
              </div>

              {unitCategory && (
                unitCategory === "currency" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">From</label>
                        <select
                          value={unitFrom}
                          onChange={(e) => setUnitFrom(e.target.value)}
                          className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select currency</option>
                          {getSupportedCurrencies().map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">To</label>
                        <select
                          value={unitTo}
                          onChange={(e) => setUnitTo(e.target.value)}
                          className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select currency</option>
                          {getSupportedCurrencies().map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-foreground">Value</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Enter value"
                        value={unitValue}
                        onChange={(e) => setUnitValue(e.target.value)}
                        className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <Button
                      onClick={handleConvert}
                      disabled={!unitFrom || !unitTo || !unitValue || converting}
                      className="w-full"
                    >
                      {converting ? "Converting..." : "Convert Currency"}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">From</label>
                        <select
                          value={unitFrom}
                          onChange={(e) => setUnitFrom(e.target.value)}
                          className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select unit</option>
                          {getUnitsForCategory(unitCategory).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">To</label>
                        <select
                          value={unitTo}
                          onChange={(e) => setUnitTo(e.target.value)}
                          className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select unit</option>
                          {getUnitsForCategory(unitCategory).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-foreground">Value</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Enter value"
                        value={unitValue}
                        onChange={(e) => setUnitValue(e.target.value)}
                        className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <Button
                      onClick={handleConvert}
                      disabled={!unitFrom || !unitTo || !unitValue || converting}
                      className="w-full"
                    >
                      {converting ? "Converting..." : "Convert Unit"}
                    </Button>
                  </>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata Converter Tab */}
      {activeTab === "metadata" && (
        <Card>
          <CardHeader>
            <CardTitle>Metadata Transformation</CardTitle>
            <CardDescription>Transform metadata between JSON, XML, YAML, and CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">Source Format</label>
                  <select
                    value={metaSourceFormat}
                    onChange={(e) => setMetaSourceFormat(e.target.value)}
                    className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="json">JSON</option>
                    <option value="xml">XML</option>
                    <option value="yaml">YAML</option>
                    <option value="csv_meta">CSV</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">Target Format</label>
                  <select
                    value={metaTargetFormat}
                    onChange={(e) => setMetaTargetFormat(e.target.value)}
                    className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="yaml">YAML</option>
                    <option value="json">JSON</option>
                    <option value="xml">XML</option>
                    <option value="csv_meta">CSV</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Source Metadata</label>
                <textarea
                  value={metaValue}
                  onChange={(e) => setMetaValue(e.target.value)}
                  className="w-full h-48 border border-input bg-background px-3 py-2 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder='{"key": "value"}'
                />
              </div>

              <Button
                onClick={handleConvert}
                disabled={converting}
                className="w-full"
              >
                {converting ? "Transforming..." : "Transform Metadata"}
              </Button>

              {metaResult && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">Result</label>
                  <div className="relative">
                    <textarea
                      value={metaResult}
                      readOnly
                      className="w-full h-48 border border-input bg-background px-3 py-2 rounded-md text-sm font-mono focus:outline-none"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(metaResult)
                      }}
                      className="absolute right-2 top-2 text-xs"
                      size="sm"
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversion Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Jobs</CardTitle>
          <div className="flex items-center gap-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder={t("searchJobs")}
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
                  (job.source_url || "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                  job.target_format.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                  job.status.toLowerCase().includes(debouncedSearch.toLowerCase())
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
                      <Button
                        className="ml-4 text-sm text-primary hover:underline"
                        onClick={() => {
                          const downloadUrl =
                            job.download_url ||
                            job.output_url ||
                            `/api/conversion/${job.id}?download=true`
                          handleDownload(downloadUrl, job.target_format)
                        }}
                      >
                        Download
                      </Button>
                    )}
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