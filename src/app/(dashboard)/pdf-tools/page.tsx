"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DashboardHeader } from "@/components/dashboard/header"
import { useToast } from "@/components/ui/use-toast"
import {
  FileImage,
  Files,
  Scissors,
  RotateCw,
  Minimize2,
  Lock,
  Unlock,
  Eye,
  Download,
  Plus,
  Trash2,
  ArrowUpDown,
  Loader2,
  Check,
  X,
  Settings,
} from "lucide-react"

const PDF_TOOLS = [
  {
    id: "merge",
    label: "Merge PDFs",
    description: "Combine multiple PDFs into one document",
    icon: Files,
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "split",
    label: "Split PDF",
    description: "Extract pages or split by range",
    icon: Scissors,
    color: "bg-green-100 text-green-600",
  },
  {
    id: "compress",
    label: "Compress PDF",
    description: "Reduce file size while maintaining quality",
    icon: Minimize2,
    color: "bg-purple-100 text-purple-600",
  },
  {
    id: "rotate",
    label: "Rotate Pages",
    description: "Rotate specific pages or all pages",
    icon: RotateCw,
    color: "bg-orange-100 text-orange-600",
  },
  {
    id: "protect",
    label: "Protect/Unlock",
    description: "Add password protection or remove it",
    icon: Lock,
    color: "bg-red-100 text-red-600",
  },
  {
    id: "watermark",
    label: "Add Watermark",
    description: "Add text or image watermarks",
    icon: Eye,
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "ocr",
    label: "OCR (Text Recognition)",
    description: "Extract text from scanned PDFs",
    icon: FileImage,
    color: "bg-pink-100 text-pink-600",
  },
  {
    id: "pagenumbers",
    label: "Add Page Numbers",
    description: "Insert page numbers with custom format",
    icon: Settings,
    color: "bg-teal-100 text-teal-600",
  },
]

export default function PDFToolsPage() {
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  const tool = PDF_TOOLS.find((t) => t.id === selectedTool)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...newFiles])
    e.target.value = ""
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleProcess = async () => {
    if (files.length === 0) {
      toast({ title: "Please select at least one file", variant: "destructive" })
      return
    }

    setProcessing(true)
    setProgress(0)

    try {
      // Simulate processing
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        setProgress(i)
      }

      toast({ title: `${tool?.label} completed successfully`, variant: "success" })
      setFiles([])
    } catch (e) {
      toast({ title: "Processing failed", variant: "destructive" })
    } finally {
      setProcessing(false)
      setProgress(0)
    }
  }

  if (!selectedTool) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          title="PDF Tools"
          description="Complete suite of PDF manipulation tools"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PDF_TOOLS.map((tool) => (
            <Card
              key={tool.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200 group"
              onClick={() => setSelectedTool(tool.id)}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className={`h-16 w-16 rounded-xl flex items-center justify-center mx-auto mb-4 ${tool.color}`}>
                    <tool.icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{tool.label}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>
                  <Button variant="outline" className="w-full">
                    Open Tool
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={tool!.label}
        description={tool!.description}
        action={
          <Button variant="outline" onClick={() => setSelectedTool(null)}>
            <X className="h-4 w-4 mr-2" />
            Back to Tools
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Upload Area */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                files.length > 0 ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"
              }`}
              onClick={() => document.getElementById("pdf-file-input")?.click()}
            >
              <input
                id="pdf-file-input"
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileImage className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                {files.length > 0 ? `${files.length} file(s) selected` : "Click to upload PDFs"}
              </p>
              <p className="text-xs text-muted-foreground">Drag and drop or click to browse</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <FileImage className="h-5 w-5 text-primary" />
                      <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeFile(index) }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleProcess}
              disabled={files.length === 0 || processing}
              className="w-full"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing... {progress}%
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {tool!.label}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Tool Options & Output */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tool Options</CardTitle>
              <CardDescription>Configure settings for {tool!.label.toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              <ToolOptions toolId={selectedTool} />
            </CardContent>
          </Card>

          {processing && progress > 0 && progress < 100 && (
            <Card>
              <CardHeader>
                <CardTitle>Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolOptions({ toolId }: { toolId: string }) {
  switch (toolId) {
    case "merge":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Files will be merged in the order listed above. Drag to reorder.</p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" defaultChecked />
              Add bookmarks for each file
            </label>
          </div>
        </div>
      )
    case "split":
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Split Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="split-mode" defaultChecked className="rounded" />
                Extract pages (e.g., 1,3,5-10)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="split-mode" className="rounded" />
                Split every N pages
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="split-mode" className="rounded" />
                Split by bookmarks
              </label>
            </div>
          </div>
          <Input placeholder="Page range (e.g., 1,3,5-10)" />
        </div>
      )
    case "compress":
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Compression Level</label>
            <div className="flex items-center gap-4">
              <input type="range" min="0" max="100" defaultValue="50" className="flex-1" />
              <span className="text-sm text-muted-foreground">Balanced</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lower = smaller file, higher = better quality</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" defaultChecked />
              Optimize images
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" />
              Remove unused objects
            </label>
          </div>
        </div>
      )
    case "rotate":
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Rotation</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="rotate" defaultChecked className="rounded" />
                90° Clockwise
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="rotate" className="rounded" />
                180°
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="rotate" className="rounded" />
                90° Counter-clockwise
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" defaultChecked />
              Apply to all pages
            </label>
          </div>
        </div>
      )
    case "protect":
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Action</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="protect" defaultChecked className="rounded" />
                Add Password
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="protect" className="rounded" />
                Remove Password
              </label>
            </div>
          </div>
          <Input type="password" placeholder="Enter password" />
          <Input type="password" placeholder="Confirm password" />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" defaultChecked />
              Restrict printing
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" />
              Restrict editing
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" />
              Restrict copying
            </label>
          </div>
        </div>
      )
    case "watermark":
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Watermark Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="watermark" defaultChecked className="rounded" />
                Text
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="watermark" className="rounded" />
                Image
              </label>
            </div>
          </div>
          <Input placeholder="Watermark text (e.g., CONFIDENTIAL)" />
          <div className="grid grid-cols-2 gap-4">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="top-left">Top Left</SelectItem>
                <SelectItem value="top-right">Top Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="diagonal">Diagonal</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Opacity (0-100)" defaultValue={30} />
          </div>
        </div>
      )
    case "ocr":
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Language</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eng">English</SelectItem>
                <SelectItem value="spa">Spanish</SelectItem>
                <SelectItem value="fra">French</SelectItem>
                <SelectItem value="deu">German</SelectItem>
                <SelectItem value="chi_sim">Chinese (Simplified)</SelectItem>
                <SelectItem value="jpn">Japanese</SelectItem>
                <SelectItem value="kor">Korean</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" defaultChecked />
              Create searchable PDF
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" />
              Deskew pages
            </label>
          </div>
        </div>
      )
    case "pagenumbers":
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Format</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1, 2, 3">1, 2, 3...</SelectItem>
                <SelectItem value="Page 1, Page 2">Page 1, Page 2...</SelectItem>
                <SelectItem value="1 of 10">1 of 10, 2 of 10...</SelectItem>
                <SelectItem value="i, ii, iii">i, ii, iii... (Roman)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-center">Bottom Center</SelectItem>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                <SelectItem value="top-center">Top Center</SelectItem>
                <SelectItem value="top-right">Top Right</SelectItem>
                <SelectItem value="top-left">Top Left</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Start from page" defaultValue={1} />
          </div>
        </div>
      )
    default:
      return <p className="text-muted-foreground">Select a tool to see options</p>
  }
}

// Import Select for tool options
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"