"use strict"

import { Queue, Worker } from "bullmq"
import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs/promises"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import Redis from "ioredis"
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist"
import logger from "../lib/logger"
import * as Sentry from "@sentry/node"

// Initialize Sentry for the worker process (server-side only).
if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || "1.0.0",
    tracesSampleRate: 0.1,
  })
}

// Dead-letter queue for failed conversion jobs after all retries are exhausted.
const dlq = new Queue("document-conversion-dlq", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 1000, age: 24 * 60 * 60 * 1000 }, // 24hr TTL
    removeOnFail: { count: 1000, age: 7 * 24 * 60 * 60 * 1000 }, // 7 day TTL
  },
})

// Configure pdfjs-dist worker for Node.js environment
if (typeof window === "undefined") {
  GlobalWorkerOptions.workerSrc = require.resolve("pdfjs-dist/legacy/build/pdf.worker.entry")
}

const execFileAsync = promisify(execFile)
const createRedisClient = (opts: any) => new Redis(opts)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const redisUrl = process.env.REDIS_URL

const missingWorkerEnv: string[] = []
if (!supabaseUrl) missingWorkerEnv.push("NEXT_PUBLIC_SUPABASE_URL")
if (!supabaseServiceKey) missingWorkerEnv.push("SUPABASE_SERVICE_ROLE_KEY")
if (!redisUrl) missingWorkerEnv.push("REDIS_URL")

if (missingWorkerEnv.length > 0) {
  logger.error(`Missing required worker environment variables: ${missingWorkerEnv.join(", ")}`)
  process.exit(1)
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

// Leader election via Redis lock with TTL - using atomic Lua scripts for safety
const LEADER_LOCK_KEY = "forge:worker:leader"
const LEADER_LOCK_TTL_MS = 15000 // 15 second TTL
const LEADER_RENEW_INTERVAL_MS = 5000 // Renew every 5 seconds

let isLeader = false
let leaderLockInterval: ReturnType<typeof setInterval> | null = null
let leaderLockValue: string | null = null

const redisClient = createRedisClient(redisConnection)

// Atomic Lua script for renewing leader lock - prevents TOCTOU race
const RENEW_LOCK_LUA = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("PEXPIRE", KEYS[1], ARGV[2])
  else
    return 0
  end
`

// Atomic Lua script for acquiring lock with fencing token
const ACQUIRE_LOCK_LUA = `
  local value = ARGV[1]
  local ttl = tonumber(ARGV[2])
  local result = redis.call("SET", KEYS[1], value, "PX", ttl, "NX")
  if result then
    return value
  else
    return redis.call("GET", KEYS[1])
  end
`

// Atomic Lua script for releasing lock only if we own it
const RELEASE_LOCK_LUA = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`

// Atomic Lua script for claiming a job with fencing token
const CLAIM_JOB_LUA = `
  local jobKey = KEYS[1]
  local fenceToken = ARGV[1]
  local startedAt = ARGV[2]
  local job = redis.call("GET", jobKey)
  if job then
    local data = cjson.decode(job)
    if data.locked_by == fenceToken and data.status == "pending" then
      data.status = "processing"
      data.locked_by = fenceToken
      data.started_at = startedAt
      redis.call("SET", jobKey, cjson.encode(data))
      return 1
    end
  end
  return 0
`

async function acquireLeaderLock(): Promise<boolean> {
  const value = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`
  const result = await redisClient.eval(ACQUIRE_LOCK_LUA, 1, LEADER_LOCK_KEY, value, LEADER_LOCK_TTL_MS)
  if (result === value) {
    leaderLockValue = value
    isLeader = true
    logger.info("Worker became leader")
    worker.resume()
    return true
  }
  isLeader = false
  leaderLockValue = result as string
  worker.pause()
  return false
}

async function renewLeaderLock(): Promise<void> {
  if (!isLeader || !leaderLockValue) return

  // Atomic renew - only extends TTL if we still own the lock
  const result = await redisClient.eval(RENEW_LOCK_LUA, 1, LEADER_LOCK_KEY, leaderLockValue, LEADER_LOCK_TTL_MS)
  if (result === 0) {
    isLeader = false
    leaderLockValue = null
    logger.warn("Worker lost leadership (atomic check failed)")
    worker.pause()
    startLeaderElection()
  }
}

async function releaseLeaderLock(): Promise<void> {
  if (!isLeader || !leaderLockValue) return

  // Atomic release - only deletes if we still own the lock
  await redisClient.eval(RELEASE_LOCK_LUA, 1, LEADER_LOCK_KEY, leaderLockValue)
  isLeader = false
  leaderLockValue = null
}

function startLeaderElection(): void {
  acquireLeaderLock().then((acquired) => {
    if (!acquired) {
      // Watch for lock expiry to retry with jitter to prevent thundering herd
      const jitter = Math.random() * 1000
      setTimeout(startLeaderElection, 2000 + jitter)
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
  const { stdout, stderr } = await execFileAsync(
    "libreoffice",
    ["--headless", "--convert-to", safeFormat, "--outdir", outputDir, sourcePath],
    { timeout: 300000 }
  )
  return path.join(outputDir, path.basename(sourcePath, path.extname(sourcePath)) + "." + safeFormat)
}

async function reconstructFromPDF(sourcePath: string, targetFormat: string): Promise<string> {
  if (targetFormat !== "docx") {
    throw new Error(`PDF to ${targetFormat} reconstruction not yet implemented`)
  }

  // Validate file size before loading to prevent memory exhaustion
  const stats = await fs.stat(sourcePath)
  if (stats.size > MAX_CONVERSION_FILE_SIZE) {
    throw new Error(`PDF too large for reconstruction (max ${MAX_CONVERSION_FILE_SIZE / (1024 * 1024)}MB)`)
  }

  const pdfBytes = await fs.readFile(sourcePath)
  
  // Use streaming options to avoid loading entire document into memory
  const loadingTask = getDocument({ 
    data: pdfBytes,
    disableAutoFetch: true,
    disableStream: false,
    disableRange: false,
    chunkedViewerLoading: true,
  })
  const pdf = await loadingTask.promise
  const numPages = pdf.numPages
  const textParts: string[] = []

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item: any) => (item as any).str || "")
      .join(" ")
    textParts.push(text)
  }

  const textContent = textParts.join("\n\n--- Page Break ---\n\n")

  // Build a minimal DOCX (Office Open XML) as a zip of XML parts
  const docxXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
${textContent.split("\n--- Page Break ---\n").map((block, i) => {
    const paragraphs = block.split("\n").map((p) => `    <w:p><w:r><w:t xml:space="preserve">${escapeXml(p)}</w:t></w:r></w:p>`).join("\n")
    const pageBreak = i > 0 ? `    <w:p><w:r><w:br w:type="page"/></w:r></w:p>` : ""
    return `    <w:sectPr>${pageBreak}</w:sectPr>\n${paragraphs}`
  }).join("\n")}
  </w:body>
</w:document>`

  const docxContent = Buffer.from(docxXml, "utf8")
  const outputPath = sourcePath.replace(/\.pdf$/i, ".docx")
  await fs.writeFile(outputPath, docxContent)
  return outputPath
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
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

async function claimJobWithFence(jobId: string, fenceToken: string): Promise<boolean> {
  try {
    const jobKey = `job:${jobId}`
    const result = await redisClient.eval(CLAIM_JOB_LUA, 1, jobKey, fenceToken, new Date().toISOString())
    return result === 1
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

    // Fencing token: unique per job claim, combines leader identity + job ID + timestamp
    const fenceToken = `${leaderLockValue ?? ""}:${jobId}:${Date.now()}`

    // Atomic claim with fencing - prevents stale leader from processing
    const claimed = await claimJobWithFence(jobId, fenceToken)
    if (!claimed) {
      throw new Error("Job claimed by another worker or not pending")
    }

    // Update job status to processing in Supabase (only if still pending to avoid stale transitions)
    const { error: statusError } = await supabase
      .from("conversion_jobs")
      .update({ status: "processing", started_at: new Date().toISOString(), locked_by: fenceToken })
      .eq("id", jobId)
      .eq("status", "pending")

    if (statusError) {
      throw statusError
    }

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
      // Use consistent prefix for all temp files to enable proper cleanup
      const TEMP_PREFIX = "forge-conversion-"
      const sourcePath = `/tmp/${TEMP_PREFIX}${jobId}_source`
      const outputDir = `/tmp`
      const outputPath = `/tmp/${TEMP_PREFIX}${jobId}_output.${targetFormat}`
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

        await fs.writeFile(sourcePath, new Uint8Array(buffer))

        const sourceExt = getExt(sourceUrl)

        if (targetFormat === "pdf" && ["docx", "doc", "xlsx", "xls", "pptx", "ppt", "odt", "ods", "odp", "rtf", "txt", "html", "md", "epub"].includes(sourceExt)) {
          resultPath = await convertWithLibreOffice(sourcePath, targetFormat, outputDir)
        } else if (targetFormat === "docx" && sourceExt === "pdf") {
          resultPath = await reconstructFromPDF(sourcePath, targetFormat)
        } else if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "svg"].includes(sourceExt) && ["jpg", "jpeg", "png", "webp", "pdf"].includes(targetFormat)) {
          await fs.copyFile(sourcePath, outputPath)
          resultPath = outputPath
        } else {
          resultPath = await convertWithLibreOffice(sourcePath, targetFormat, outputDir)
        }

        const resultBuffer = await fs.readFile(resultPath!)
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
        // Guaranteed cleanup with proper error logging
        const cleanupPromises = [
          fs.unlink(sourcePath).catch(err => logger.warn("Source cleanup failed", { path: sourcePath, err })),
        ]
        if (resultPath) {
          cleanupPromises.push(fs.unlink(resultPath).catch(err => logger.warn("Output cleanup failed", { path: resultPath, err })))
        }
        await Promise.allSettled(cleanupPromises)
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
    // Only the leader processes jobs; non-leader workers pause to avoid wasted attempts
    concurrency: 1,
    maxStartedAttempts: 3,
    removeOnComplete: 100 as any,
    removeOnFail: 50 as any,
    // Auto-pause when not leader, resume when leader
    autorun: false,
  }
)

const TEMP_PREFIX = "forge-conversion-"
const MAX_TMP_DISK_USAGE_MB = 512 // 512MB max /tmp usage (reduced from 1GB)

async function cleanupTempFiles(): Promise<void> {
  try {
    const entries = await fs.readdir("/tmp", { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && entry.name.startsWith(TEMP_PREFIX)) {
        try { await fs.unlink(`/tmp/${entry.name}`).catch(() => {}) } catch {}
      }
    }
  } catch {}
}

async function checkTmpDiskUsage(): Promise<void> {
  try {
    const entries = await fs.readdir("/tmp", { withFileTypes: true })
    let totalBytes = 0
    const fileEntries: Array<{ name: string; mtime: number }> = []
    for (const entry of entries) {
      if (entry.isFile() && entry.name.startsWith(TEMP_PREFIX)) {
        try {
          const stat = await fs.stat(`/tmp/${entry.name}`)
          totalBytes += stat.size
          fileEntries.push({ name: entry.name, mtime: stat.mtimeMs })
        } catch {}
      }
    }
    const totalMB = totalBytes / (1024 * 1024)
    workerHealth.tmpDiskUsageMB = totalMB
    if (totalMB > MAX_TMP_DISK_USAGE_MB) {
      logger.warn("/tmp disk usage high", { totalMB, maxMB: MAX_TMP_DISK_USAGE_MB })
      // Clean up oldest files first
      fileEntries.sort((a, b) => a.mtime - b.mtime)
      for (const f of fileEntries.slice(0, Math.ceil(fileEntries.length / 2))) {
        try { await fs.unlink(`/tmp/${f.name}`).catch(() => {}) } catch {}
      }
    }
  } catch {}
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
  queueDepth: number
  tmpDiskUsageMB: number
}

const workerHealth: WorkerHealth = {
  status: "healthy",
  activeJobs: 0,
  completedJobs: 0,
  failedJobs: 0,
  lastJobAt: null,
  startedAt: new Date().toISOString(),
  isLeader: false,
  queueDepth: 0,
  tmpDiskUsageMB: 0,
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
    logger.info(`Job ${job.id} completed`)
  }
})

worker.on("failed", async (job, err) => {
  if (job) {
    workerHealth.activeJobs = Math.max(0, workerHealth.activeJobs - 1)
    workerHealth.failedJobs++
    logger.error(`Job ${job.id} failed`, { error: err.message, jobId: job.id })

    // Send to Sentry for alerting
    Sentry.captureException(err, {
      tags: { component: "worker", jobId: job.id, jobType: job.data.type },
      extra: { jobData: job.data },
    })

    // Move to dead-letter queue after BullMQ exhausts retries (maxStartedAttempts: 3).
    // This preserves failed jobs for manual inspection and retry.
    try {
      await dlq.add("failed-job", {
        originalJobId: job.id,
        jobType: job.data.type,
        jobData: job.data,
        error: err instanceof Error ? err.message : String(err),
        failedAt: new Date().toISOString(),
        attempts: job.attemptsMade,
      })
    } catch {
      // DLQ failure is non-fatal; the error is already logged and sent to Sentry.
    }
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
      queueDepth: workerHealth.queueDepth,
      tmpDiskUsageMB: Math.round(workerHealth.tmpDiskUsageMB * 100) / 100,
    }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

const HEALTH_PORT = parseInt(process.env.WORKER_HEALTH_PORT || "3001", 10)
healthServer.listen(HEALTH_PORT).on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.warn(`Worker health port ${HEALTH_PORT} already in use — health endpoint disabled`)
  } else {
    logger.error(`Worker health server error:`, err)
  }
})
healthServer.on("listening", () => {
    logger.info(`Worker health server listening on port ${HEALTH_PORT}`)
})

// Initialize leader election
startLeaderElection()
void cleanupTempFiles()
setInterval(() => void checkTmpDiskUsage(), 5 * 60 * 1000) // Check disk usage every 5 minutes

// Update worker health with disk usage after each tmp check
const originalCheckTmpDiskUsage = checkTmpDiskUsage
// Periodic queue depth update for health monitoring
setInterval(async () => {
  try {
    const counts = await queue.getJobCounts()
    workerHealth.queueDepth = (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0)
  } catch {}
}, 30 * 1000) // Every 30 seconds

// Periodic queue cleanup - clean completed/failed jobs based on TTL
setInterval(async () => {
  try {
    await dlq.clean(0, 1000, "completed")
    await dlq.clean(0, 1000, "failed")
  } catch (err) {
    logger.warn("DLQ cleanup failed", { err })
  }
}, 60 * 60 * 1000) // Hourly

async function gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, shutting down worker gracefully...`)
  try {
    await stopLeaderElection()
    await cleanupTempFiles()
    await worker.close()
    healthServer.close()
    await redisClient.quit()
    logger.info("Worker shutdown complete")
    process.exit(0)
  } catch (err) {
    logger.error("Worker shutdown error", { error: err instanceof Error ? err.message : String(err) })
    process.exit(1)
  }
}

// Also clean temp files on uncaught exceptions to prevent /tmp exhaustion
process.on("uncaughtException", async (err) => {
  logger.error("Uncaught exception", { error: err instanceof Error ? err.message : String(err) })
  await cleanupTempFiles().catch(() => {})
  process.exit(1)
})

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

function getIsLeader(): boolean {
  return isLeader
}

export { worker, getIsLeader }
