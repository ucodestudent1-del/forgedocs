"use strict"

const { Queue, Worker } = require("bullmq")
const { exec } = require("child_process")
const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const redisConnection = { host: process.env.REDIS_HOST || "localhost", port: parseInt(process.env.REDIS_PORT || "6379") }

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const conversionQueue = new Queue("document-conversion", { connection: redisConnection })

// LibreOffice conversion
async function convertWithLibreOffice(sourcePath, targetFormat, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = `libreoffice --headless --convert-to ${target_format} --outdir ${output_dir} ${source_path}`
    exec(cmd, { timeout: 300000 }, (error, stdout, stderr) => {
      if (error) reject(error)
      else resolve(outputPath)
    })
  })
}

// PDF to Office reconstruction (placeholder — uses pdf2docx or similar)
async function reconstructFromPDF(sourcePath, targetFormat) {
  // Implementation would use pdf2docx, pdf2xlsx, etc.
  throw new Error("PDF reconstruction not yet implemented")
}

const worker = new Worker(
  "document-conversion",
  async (job) => {
    const { userId, sourceUrl, targetFormat, jobId } = job.data

    // Update job status to processing
    await supabase.from("conversion_jobs").update({ status: "processing", started_at: new Date().toISOString() }).eq("id", jobId)

    try {
      // Download source file from Supabase Storage
      const { data: sourceFile, error: downloadError } = await supabase.storage.from("documents").download(sourceUrl)

      if (downloadError) throw downloadError

      const sourcePath = `/tmp/${jobId}_source`
      const outputPath = `/tmp/${jobId}_output.${targetFormat}`

      // Write source to temp file
      const fs = require("fs")
      fs.writeFileSync(sourcePath, await sourceFile.arrayBuffer())

      // Convert based on format
      let resultPath
      if (targetFormat === "pdf" && ["docx", "xlsx", "pptx"].includes(getExt(sourceUrl))) {
        resultPath = await convertWithLibreOffice(sourcePath, targetFormat, "/tmp")
      } else if (targetFormat === "docx" && getExt(sourceUrl) === "pdf") {
        resultPath = await reconstructFromPDF(sourcePath, targetFormat)
      } else {
        resultPath = await convertWithLibreOffice(sourcePath, targetFormat, "/tmp")
      }

      // Upload result to Supabase Storage
      const resultBuffer = fs.readFileSync(resultPath)
      const { error: uploadError } = await supabase.storage.from("converted").upload(`${userId}/${jobId}.${targetFormat}`, resultBuffer, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage.from("converted").getPublicUrl(`${userId}/${jobId}.${targetFormat}`)

      // Update job as completed
      await supabase.from("conversion_jobs").update({
        status: "completed",
        output_url: urlData.publicUrl,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId)

      // Cleanup
      fs.unlinkSync(sourcePath)
      fs.unlinkSync(resultPath)

      return { success: true, outputUrl: urlData.publicUrl }
    } catch (err) {
      await supabase.from("conversion_jobs").update({
        status: "failed",
        error_message: err.message,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId)
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

function getExt(url) {
  return url.split(".").pop()?.toLowerCase() || ""
}

module.exports = { conversionQueue }
