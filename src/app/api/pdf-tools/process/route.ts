import { NextRequest, NextResponse } from "next/server"
import { getRouteClient } from "@/lib/supabase"
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib"

export async function POST(request: NextRequest) {
  try {
    const supabase = await getRouteClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const tool = formData.get("tool") as string

    if (!files.length || !tool) {
      return NextResponse.json({ error: "Missing files or tool" }, { status: 400 })
    }

    const validTools = ["merge", "split", "compress", "rotate", "protect", "unprotect", "watermark", "ocr", "pagenumbers"]
    if (!validTools.includes(tool)) {
      return NextResponse.json({ error: "Invalid tool" }, { status: 400 })
    }

    // Validate file size per file (max 25MB per PDF to prevent memory exhaustion)
    const MAX_PDF_SIZE = 25 * 1024 * 1024
    for (const file of files) {
      if (file.type !== "application/pdf") {
        return NextResponse.json({ error: "All files must be PDF" }, { status: 400 })
      }
      if (file.size > MAX_PDF_SIZE) {
        return NextResponse.json({ error: `PDF file too large (max ${MAX_PDF_SIZE / (1024 * 1024)}MB)` }, { status: 400 })
      }
    }

    let processedPdf: Uint8Array
    const fileName = files[0].name.replace(/\.pdf$/i, "")

    switch (tool) {
      case "merge":
        processedPdf = await mergePdfs(files)
        break
      case "split":
        processedPdf = await splitPdf(files[0])
        break
      case "compress":
        processedPdf = await compressPdf(files[0])
        break
      case "rotate":
        processedPdf = await rotatePdf(files[0])
        break
      case "protect":
        processedPdf = await protectPdf(files[0])
        break
      case "unprotect":
        processedPdf = await unprotectPdf(files[0])
        break
      case "watermark":
        processedPdf = await watermarkPdf(files[0])
        break
      case "pagenumbers":
        processedPdf = await addPageNumbers(files[0])
        break
      case "ocr":
        const { performOCR } = await import("@/lib/ocr")
        
        const file = files[0]
        if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
          return NextResponse.json({ error: "OCR requires PDF or image file" }, { status: 400 })
        }
        
        try {
          const result = await performOCR(file, { provider: 'auto', fallbackToCloud: true })
          return NextResponse.json({ 
            text: result.text,
            confidence: result.confidence,
            pages: result.pages,
            provider: result.provider,
            message: `OCR complete (${result.confidence}% confidence)`
          })
        } catch (error) {
          console.error("OCR processing failed:", error)
          return NextResponse.json({ error: "OCR processing failed" }, { status: 500 })
        }
      default:
        return NextResponse.json({ error: "Tool not implemented" }, { status: 501 })
    }

    const blob = new Blob([processedPdf as unknown as BlobPart], { type: "application/pdf" })
    const downloadUrl = URL.createObjectURL(blob)
    
    return NextResponse.json({ 
      downloadUrl,
      message: `${tool} processing complete`,
      fileName: `${fileName}-${tool}.pdf`
    })
  } catch (error) {
    console.error("PDF tool error:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}

async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create()
  
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(arrayBuffer)
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
    copiedPages.forEach(page => mergedPdf.addPage(page))
  }
  
  return mergedPdf.save()
}

async function splitPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await PDFDocument.load(arrayBuffer)
  const newPdf = await PDFDocument.create()
  const [firstPage] = await newPdf.copyPages(pdf, [0])
  newPdf.addPage(firstPage)
  return newPdf.save()
}

async function compressPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await PDFDocument.load(arrayBuffer)
  return pdf.save({ useObjectStreams: false })
}

async function rotatePdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await PDFDocument.load(arrayBuffer)
  
  const pages = pdf.getPages()
  pages.forEach(page => {
    page.setRotation(degrees(90))
  })
  
  return pdf.save()
}

async function protectPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await PDFDocument.load(arrayBuffer)
  return pdf.save()
}

async function unprotectPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await PDFDocument.load(arrayBuffer)
  return pdf.save()
}

async function watermarkPdf(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await PDFDocument.load(arrayBuffer)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  
  const pages = pdf.getPages()
  pages.forEach(page => {
    const { width, height } = page.getSize()
    page.drawText("CONFIDENTIAL", {
      x: width / 2 - 100,
      y: height / 2,
      size: 60,
      font,
      color: rgb(1, 0, 0),
      opacity: 0.3,
      rotate: degrees(-45),
    })
  })
  
  return pdf.save()
}

async function addPageNumbers(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await PDFDocument.load(arrayBuffer)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  
  const pages = pdf.getPages()
  pages.forEach((page, index) => {
    const { width, height } = page.getSize()
    page.drawText(`${index + 1}`, {
      x: width - 50,
      y: 30,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    })
  })
  
  return pdf.save()
}