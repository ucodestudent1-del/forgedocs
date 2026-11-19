"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, RotateCw, Fullscreen, Minimize, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface PDFPreviewProps {
  url: string
  title?: string
  onClose?: () => void
  className?: string
}

export function PDFPreview({ url, title, onClose, className }: PDFPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pdfDocRef = useRef<any>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Dynamic import of pdfjs-dist
  const [pdfjsLib, setPdfjsLib] = useState<any>(null)

  useEffect(() => {
    import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version}/pdf.worker.min.js`
      setPdfjsLib(lib)
    }).catch(() => {
      setError("Failed to load PDF viewer")
      setLoading(false)
    })
  }, [])

  const loadPDF = async () => {
    if (!pdfjsLib || !url) return
    setLoading(true)
    setError(null)
    try {
      const loadingTask = pdfjsLib.getDocument(url)
      const pdf = await loadingTask.promise
      pdfDocRef.current = pdf
      setNumPages(pdf.numPages)
      setCurrentPage(1)
      setScale(1)
      setRotation(0)
      renderPage(1)
    } catch (err) {
      console.error("PDF load error:", err)
      setError("Failed to load PDF")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pdfjsLib) {
      loadPDF()
    }
  }, [pdfjsLib, url])

  const renderPage = async (pageNum: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return
    setLoading(true)
    try {
      const page = await pdfDocRef.current.getPage(pageNum)
      const viewport = page.getViewport({ scale, rotation })

      const canvas = canvasRef.current
      const context = canvas.getContext("2d")
      if (!context) return

      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({ canvasContext: context, viewport }).promise
      setLoading(false)
    } catch (err) {
      console.error("Page render error:", err)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentPage > 0 && currentPage <= numPages) {
      renderPage(currentPage)
    }
  }, [currentPage, scale, rotation, numPages])

  const handleDownload = async () => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = title || "document.pdf"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error("Download failed:", err)
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page)
    }
  }

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5))
  const rotateLeft = () => setRotation(prev => (prev - 90 + 360) % 360)
  const rotateRight = () => setRotation(prev => (prev + 90) % 360)

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.()
    }
  }

  if (error) {
    return (
      <Card className={cn("w-full max-w-3xl mx-auto", className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{title || "PDF Preview"}</span>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕ Close
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-destructive">{error}</p>
          <Button onClick={handleDownload} className="mt-4" disabled={loading}>
            Download Instead
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full max-w-3xl mx-auto", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <FileText className="h-5 w-5 text-primary" />
          <div className="min-w-0">
            <CardTitle className="truncate">{title || "PDF Preview"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {currentPage} / {numPages} pages • {Math.round(scale * 100)}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={containerRef}
          className={cn(
            "relative bg-muted/50 rounded-lg overflow-hidden",
            isFullscreen && "fixed inset-0 z-50 bg-black w-screen h-screen rounded-none"
          )}
          style={{ minHeight: isFullscreen ? "100vh" : "600px" }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="sr-only">Loading PDF...</span>
            </div>
          )}
          
          <div className="flex items-center justify-center p-4" style={{ minHeight: "400px" }}>
            <canvas
              ref={canvasRef}
              className="shadow-lg bg-white max-w-full max-h-[70vh]"
              style={{
                transform: `rotate(${rotation}deg)`,
                maxWidth: "100%",
              }}
            />
          </div>

          {/* Page Navigation */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-background/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border">
            <Button variant="outline" size="sm" onClick={() => goToPage(1)} disabled={currentPage === 1 || loading}>
              <ChevronLeft className="h-4 w-4" />
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1 || loading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-4 text-sm font-medium min-w-[80px] text-center">
              {currentPage} / {numPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === numPages || loading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => goToPage(numPages)} disabled={currentPage === numPages || loading}>
              <ChevronRight className="h-4 w-4" />
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-background/90 backdrop-blur p-2 rounded-lg shadow-lg border">
            <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5} title="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3} title="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={rotateLeft} title="Rotate left">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={rotateRight} title="Rotate right">
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Fullscreen className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Inline preview component for document lists
export function InlinePDFPreview({ 
  url, 
  title,
  className 
}: { 
  url: string
  title?: string
  className?: string
}) {
  const [showPreview, setShowPreview] = useState(false)
  
  return (
    <div className={className}>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setShowPreview(true)}
        className="w-full justify-start gap-2"
      >
        <FileText className="h-4 w-4" />
        Preview PDF
      </Button>
      
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPreview(false)}>
          <PDFPreview 
            url={url} 
            title={title} 
            onClose={() => setShowPreview(false)}
            className="max-w-4xl w-full max-h-[90vh]"
          />
        </div>
      )}
    </div>
  )
}