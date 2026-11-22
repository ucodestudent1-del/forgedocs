"use strict"

import { Queue, Worker } from "bullmq"
import { exec } from "child_process"
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import Redis from "ioredis"
import logger from "@/lib/logger"
const createRedisClient = (opts: any) => new Redis(opts)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Supabase env vars missing - worker will not function correctly")
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
}

const ALLOWED_LIBREOFFICE_FORMATS = new Set([
  "pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt", "odt", "ods", "odp",
  "rtf", "txt", "html", "md", "epub",
])

// Maximum size for a single conversion source file to prevent memory/disk exhaustion
const MAX_CONVERSION_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

function validateLibreOfficeFormat(format: string): string {
  if (!ALLOWED_LIBREOFFICE_FORMATS.has(format)) {
    throw new Error(`Unsupported output format: ${format}`)
  }
  return format
}

// Leader election via Redis lock with TTL
const LEADER_LOCK_KEY = "forge:worker:leader"
const LEADER_LOCK_TTL_MS = 15000 // 15 second TTL
const LEADER_RENEW_INTERVAL_MS = 5000 // Renew every 5 seconds

let isLeader = false
let leaderLockInterval: ReturnType<typeof setInterval> | null = null
let leaderLockValue: string | null = null

const redisClient = createRedisClient(redisConnection)

async function acquireLeaderLock(): Promise<boolean> {
  const value = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`
  const result = await redisClient.set(LEADER_LOCK_KEY, value, "PX", LEADER_LOCK_TTL_MS, "NX")
  if (result === "OK") {
    leaderLockValue = value
    isLeader = true
    console.log("Worker became leader")
    return true
  }
  isLeader = false
  return false
}

async function renewLeaderLock(): Promise<void> {
  if (!isLeader || !leaderLockValue) return

  // Only renew if we still hold the lock
  const current = await redisClient.get(LEADER_LOCK_KEY)
  if (current === leaderLockValue) {
    await redisClient.pexpire(LEADER_LOCK_KEY, LEADER_LOCK_TTL_MS)
  } else {
    // We lost leadership
    isLeader = false
    leaderLockValue = null
    console.log("Worker lost leadership")
  }
}

async function releaseLeaderLock(): Promise<void> {
  if (!isLeader || !leaderLockValue) return

  // Only release if we still hold the lock
  const current = await redisClient.get(LEADER_LOCK_KEY)
  if (current === leaderLockValue) {
    await redisClient.del(LEADER_LOCK_KEY)
  }
  isLeader = false
  leaderLockValue = null
}

function startLeaderElection(): void {
  acquireLeaderLock().then((acquired) => {
    if (!acquired) {
      // Watch for lock expiry to retry
      setTimeout(startLeaderElection, 2000)
    }
    leaderLockInterval = setInterval(renewLeaderLock, LEADER_RENEW_INTERVAL_MS)
  })
}

function stopLeaderElection(): Promise<void> {
  if (leaderLockInterval) {
    clearInterval(leaderLockInterval)
    leaderLockInterval = null
  }
  return releaseLeaderLock()
}

async function convertWithLibreOffice(sourcePath: string, targetFormat: string, outputDir: string): Promise<string> {
  const safeFormat = validateLibreOfficeFormat(targetFormat)
  return new Promise<string>((resolve, reject) => {
    const cmd = `libreoffice --headless --convert-to ${safeFormat} --outdir "${outputDir}" "${sourcePath}"`
    exec(cmd, { timeout: 300000 }, (error, stdout, stderr) => {
      if (error) reject(error)
      else resolve(path.join(outputDir, path.basename(sourcePath, path.extname(sourcePath)) + "." + safeFormat))
    })
  })
}

async function reconstructFromPDF(sourcePath: string, targetFormat: string): Promise<string> {
  throw new Error(`PDF to ${targetFormat} reconstruction not yet implemented`)
}

function getExt(url: string | undefined): string {
  return url ? url.split(".").pop()?.toLowerCase() || "" : ""
}

function extToLibreOfficeFormat(ext: string): string {
  const map: Record<string, string> = {
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

interface ConversionJobData {
  type: string
  userId: string
  sourceUrl: string
  targetFormat: string
  sourceFormat: string
  jobId: string
  options?: Record<string, unknown>
  value?: string
}

async function verifyLeadership(): Promise<boolean> {
  if (!isLeader || !leaderLockValue) return false
  try {
    const current = await redisClient.get(LEADER_LOCK_KEY)
    if (current !== leaderLockValue) {
      isLeader = false
      leaderLockValue = null
      return false
    }
    return true
  } catch {
    return false
  }
}

const worker = new Worker<ConversionJobData, { success: boolean; outputUrl?: string; type?: string }>(
  "document-conversion",
  async (job) => {
    const { type, userId, sourceUrl, targetFormat, sourceFormat, jobId, options, value } = job.data

    // Fencing: verify we still hold the leader lock before processing
    if (!(await verifyLeadership())) {
      throw new Error("Worker is not the leader")
    }

    // Update job status to processing
    await supabase
      .from("conversion_jobs")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", jobId)

    try {
      // ---- Unit conversion ----
      if (type === "unit") {
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

      // ---- Metadata transformation ----
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
      const sourcePath = `/tmp/${jobId}_source`
      const outputDir = `/tmp`
      const outputPath = `/tmp/${jobId}_output.${targetFormat}`
      let sourceFile: unknown = null
      let resultPath: string | null = null

      try {
        const { data: downloadedFile, error: downloadError } = await supabase.storage.from("documents").download(sourceUrl)
        if (downloadError) throw downloadError

        sourceFile = downloadedFile
        const buffer = await (sourceFile as Blob).arrayBuffer()

        // Cap source file size to prevent memory and disk exhaustion
        if (buffer.byteLength > MAX_CONVERSION_FILE_SIZE) {
          throw new Error(`Source file too large for conversion (max ${MAX_CONVERSION_FILE_SIZE / (1024 * 1024)}MB)`)
        }

        fs.writeFileSync(sourcePath, new Uint8Array(buffer))

        const sourceExt = getExt(sourceUrl)

        if (targetFormat === "pdf" && ["docx", "doc", "xlsx", "xls", "pptx", "ppt", "odt", "ods", "odp", "rtf", "txt", "html", "md", "epub"].includes(sourceExt)) {
          resultPath = await convertWithLibreOffice(sourcePath, targetFormat, outputDir)
        } else if (targetFormat === "docx" && sourceExt === "pdf") {
          resultPath = await reconstructFromPDF(sourcePath, targetFormat)
        } else if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "svg"].includes(sourceExt) && ["jpg", "jpeg", "png", "webp", "pdf"].includes(targetFormat)) {
          fs.copyFileSync(sourcePath, outputPath)
          resultPath = outputPath
        } else {
          resultPath = await convertWithLibreOffice(sourcePath, targetFormat, outputDir)
        }

        const resultBuffer = fs.readFileSync(resultPath!)
        const storagePath = `converted/${userId}/${jobId}.${targetFormat}`
        const { error: uploadError } = await supabase.storage.from("converted").upload(storagePath, resultBuffer, { upsert: true })

        if (uploadError) throw uploadError

        const { data: urlData, error: urlError } = await supabase.storage.from("converted").createSignedUrl(storagePath, 3600)

        if (urlError) throw urlError

        await supabase
          .from("conversion_jobs")
          .update({
            status: "completed",
            output_url: urlData.signedUrl,
            output_mime_type: `application/${targetFormat}`,
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId)

        return { success: true, outputUrl: urlData.signedUrl }
      } catch (err) {
        await supabase
          .from("conversion_jobs")
          .update({
            status: "failed",
            error_message: err instanceof Error ? err.message : String(err),
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId)
        throw err
      } finally {
        try { if (sourcePath) fs.unlinkSync(sourcePath) } catch {}
        try { if (resultPath) fs.unlinkSync(resultPath) } catch {}
      }
    } catch (err) {
      await supabase
        .from("conversion_jobs")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : String(err),
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId)
      throw err
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
    maxStartedAttempts: 3,
    removeOnComplete: 100 as any,
    removeOnFail: 50 as any,
  }
)

function cleanupTempFiles(): void {
  try {
    const entries = fs.readdirSync("/tmp", { withFileTypes: true })
    for (const entry of entries) {
      const name = entry.name
      // Clean up orphaned conversion source/output files from previous crashes
      if (
        (name.endsWith("_source") || name.match(/^.*_output\.(pdf|docx|doc|xlsx|xls|pptx|ppt|odt|ods|odp|rtf|txt|html|md|epub|jpg|jpeg|png|webp|gif|bmp|tiff|svg)$/)) &&
        entry.isFile()
      ) {
        try {
          fs.unlinkSync(`/tmp/${name}`)
        } catch {
          // Ignore errors on individual file cleanup
        }
      }
    }
  } catch {
    // /tmp may not be readable in all environments
  }
}

// Worker health tracking
interface WorkerHealth {
  status: string
  activeJobs: number
  completedJobs: number
  failedJobs: number
  lastJobAt: string | null
  startedAt: string
  isLeader: boolean
}

const workerHealth: WorkerHealth = {
  status: "healthy",
  activeJobs: 0,
  completedJobs: 0,
  failedJobs: 0,
  lastJobAt: null,
  startedAt: new Date().toISOString(),
  isLeader: false,
}

worker.on("active", (job) => {
  if (job) {
    workerHealth.activeJobs++
    workerHealth.lastJobAt = new Date().toISOString()
  }
})

worker.on("completed", (job) => {
  if (job) {
    workerHealth.activeJobs = Math.max(0, workerHealth.activeJobs - 1)
    workerHealth.completedJobs++
    console.log(`Job ${job.id} completed`)
  }
})

worker.on("failed", (job, err) => {
  if (job) {
    workerHealth.activeJobs = Math.max(0, workerHealth.activeJobs - 1)
    workerHealth.failedJobs++
    logger.error(`Job ${job.id} failed`, { error: err.message, jobId: job.id })
  }
})

// Health check HTTP server
import http from "http"

const healthServer = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  if (req.url === "/health") {
    const isHealthy = workerHealth.status === "healthy" && !worker.isPaused()
    res.writeHead(isHealthy ? 200 : 503, { "Content-Type": "application/json" })
    res.end(JSON.stringify({
      status: isHealthy ? "healthy" : "unhealthy",
      isLeader,
      activeJobs: workerHealth.activeJobs,
      completedJobs: workerHealth.completedJobs,
      failedJobs: workerHealth.failedJobs,
      lastJobAt: workerHealth.lastJobAt,
      startedAt: workerHealth.startedAt,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
    }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

const HEALTH_PORT = parseInt(process.env.WORKER_HEALTH_PORT || "3001", 10)
healthServer.listen(HEALTH_PORT).on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`Worker health port ${HEALTH_PORT} already in use — health endpoint disabled`)
  } else {
    console.error(`Worker health server error:`, err)
  }
})
healthServer.on("listening", () => {
  console.log(`Worker health server listening on port ${HEALTH_PORT}`)
})

// Initialize leader election
startLeaderElection()
cleanupTempFiles()

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down worker gracefully...`)
  try {
    await stopLeaderElection()
    await worker.close()
    healthServer.close()
    await redisClient.quit()
    console.log("Worker shutdown complete")
    process.exit(0)
  } catch (err) {
    logger.error("Worker shutdown error", { error: err instanceof Error ? err.message : String(err) })
    process.exit(1)
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

function getIsLeader(): boolean {
  return isLeader
}

export { worker, getIsLeader }
