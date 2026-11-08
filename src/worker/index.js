"use strict"

const { Queue, Worker } = require("bullmq")
const { exec } = require("child_process")
const fs = require("fs")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Supabase env vars missing - worker will not function correctly")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const conversionQueue = new Queue("document-conversion", { connection: redisConnection })

// LibreOffice document conversion
async function convertWithLibreOffice(sourcePath, targetFormat, outputDir) {
  return new Promise((resolve, reject) => {
    const cmd = `libreoffice --headless --convert-to ${targetFormat} --outdir "${outputDir}" "${sourcePath}"`
    exec(cmd, { timeout: 300000 }, (error, stdout, stderr) => {
      if (error) reject(error)
      else resolve(path.join(outputDir, path.basename(sourcePath, path.extname(sourcePath)) + "." + targetFormat))
    })
  })
}

async function reconstructFromPDF(sourcePath, targetFormat) {
  throw new Error(`PDF to ${targetFormat} reconstruction not yet implemented`)
}

// Get file extension from URL/path
function getExt(url) {
  return url ? url.split(".").pop()?.toLowerCase() || "" : ""
}

// Map file extension to target format for libreoffice
function extToLibreOfficeFormat(ext) {
  const map = {
    docx: "pdf",
    doc: "pdf",
    xlsx: "pdf",
    xls: "pdf",
    pptx: "pdf",
    ppt: "pdf",
    odt: "pdf",
    ods: "pdf",
    odp: "pdf",
    rtf: "pdf",
    txt: "pdf",
    html: "pdf",
    md: "pdf",
    epub: "pdf",
  }
  return map[ext] || ext
}

const worker = new Worker(
  "document-conversion",
  async (job) => {
    const { type, userId, sourceUrl, targetFormat, sourceFormat, jobId, options, value } = job.data

    // Update job status to processing
    await supabase
      .from("conversion_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", jobId)

    try {
      // ---- Unit conversion (handled synchronously in API, but support in worker too) ----
      if (type === "unit") {
        const conversions = {
          length: {
            "m->km": (v) => v / 1000,
            "km->m": (v) => v * 1000,
            "m->cm": (v) => v * 100,
            "cm->m": (v) => v / 100,
            "m->mm": (v) => v * 1000,
            "mm->m": (v) => v / 1000,
            "km->mi": (v) => v * 0.621371,
            "mi->km": (v) => v * 1.60934,
            "m->ft": (v) => v * 3.28084,
            "ft->m": (v) => v / 3.28084,
            "m->in": (v) => v * 39.3701,
            "in->m": (v) => v / 39.3701,
            "cm->in": (v) => v / 2.54,
            "in->cm": (v) => v * 2.54,
            "ft->in": (v) => v * 12,
            "in->ft": (v) => v / 12,
          },
          mass: {
            "kg->g": (v) => v * 1000,
            "g->kg": (v) => v / 1000,
            "kg->lb": (v) => v * 2.20462,
            "lb->kg": (v) => v / 2.20462,
            "kg->oz": (v) => v * 35.274,
            "oz->kg": (v) => v / 35.274,
          },
          temperature: {
            "c->f": (v) => (v * 9) / 5 + 32,
            "f->c": (v) => ((v - 32) * 5) / 9,
            "c->k": (v) => v + 273.15,
            "k->c": (v) => v - 273.15,
          },
        }

        const category = sourceFormat
        const key = `${value && value.from ? value.from : ""}->${targetFormat}`
        // For unit conversions the result is computed in the API; worker just marks complete
        await supabase
          .from("conversion_jobs")
          .update({
            status: "completed",
            output_url: `unit://${sourceFormat}->${targetFormat}`,
            output_mime_type: "application/json",
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId)
        return { success: true, type: "unit" }
      }

      // ---- Metadata transformation (handled synchronously in API) ----
      if (type === "metadata") {
        await supabase
          .from("conversion_jobs")
          .update({
            status: "completed",
            output_url: `metadata://${sourceFormat}->${targetFormat}`,
            output_mime_type: "application/json",
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId)
        return { success: true, type: "metadata" }
      }

      // ---- Document conversion ----
      // Download source file from Supabase Storage
      const { data: sourceFile, error: downloadError } = await supabase.storage.from("documents").download(sourceUrl)
      if (downloadError) throw downloadError

      const sourcePath = `/tmp/${jobId}_source`
      const outputDir = `/tmp`
      const outputPath = `/tmp/${jobId}_output.${targetFormat}`

      // Write source to temp file
      fs.writeFileSync(sourcePath, await sourceFile.arrayBuffer())

      // Convert based on format
      let resultPath
      const sourceExt = getExt(sourceUrl)

      if (targetFormat === "pdf" && ["docx", "doc", "xlsx", "xls", "pptx", "ppt", "odt", "ods", "odp", "rtf", "txt", "html", "md", "epub"].includes(sourceExt)) {
        resultPath = await convertWithLibreOffice(sourcePath, targetFormat, outputDir)
      } else if (targetFormat === "docx" && sourceExt === "pdf") {
        resultPath = await reconstructFromPDF(sourcePath, targetFormat)
      } else if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "svg"].includes(sourceExt) && ["jpg", "jpeg", "png", "webp", "pdf"].includes(targetFormat)) {
        // Image conversion - for now copy as-is (placeholder for sharp integration)
        fs.copyFileSync(sourcePath, outputPath)
        resultPath = outputPath
      } else {
        resultPath = await convertWithLibreOffice(sourcePath, targetFormat, outputDir)
      }

      // Upload result to Supabase Storage
      const resultBuffer = fs.readFileSync(resultPath)
      const storagePath = `converted/${userId}/${jobId}.${targetFormat}`
      const { error: uploadError } = await supabase.storage.from("converted").upload(storagePath, resultBuffer, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage.from("converted").getPublicUrl(storagePath)

      // Update job as completed
      await supabase
        .from("conversion_jobs")
        .update({
          status: "completed",
          output_url: urlData.publicUrl,
          output_mime_type: `application/${targetFormat}`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId)

      // Cleanup temp files
      try { fs.unlinkSync(sourcePath) } catch {}
      try { fs.unlinkSync(resultPath) } catch {}

      return { success: true, outputUrl: urlData.publicUrl }
    } catch (err) {
      await supabase
        .from("conversion_jobs")
        .update({
          status: "failed",
          error_message: err.message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId)
      throw err
    }
  },
  { connection: redisConnection, concurrency: 5 }
)

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`)
})

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message)
})

module.exports = { conversionQueue }
