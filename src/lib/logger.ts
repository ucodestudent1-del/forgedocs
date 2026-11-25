import winston from "winston"
import path from "path"

const logDir = process.env.LOG_DIR || path.join(process.cwd(), "logs")

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : ""
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`
  })
)

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
    return `${timestamp} [${level}]: ${message} ${metaStr}`
  })
)

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === "production" ? "warn" : "debug",
  }),
]

// Add file transports only if log directory is writable
try {
  const fs = require("fs")
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    })
  )
} catch {
  // File logging unavailable — console only
}

// Optional remote log transport (e.g., Datadog, Logtail, CloudWatch via HTTP)
if (process.env.LOG_ENDPOINT) {
  transports.push(
    new (winston.transports.Http as any)({
      host: new URL(process.env.LOG_ENDPOINT).host,
      path: new URL(process.env.LOG_ENDPOINT).pathname,
      protocol: new URL(process.env.LOG_ENDPOINT).protocol,
      ssl: new URL(process.env.LOG_ENDPOINT).protocol === "https:",
      format: winston.format.json(),
      level: process.env.LOG_LEVEL || "info",
    })
  )
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "forgedocs" },
  transports,
})

// Create a child logger with request context
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({ requestId, userId })
}

const SENSITIVE_FIELDS = new Set([
  "password", "token", "secret", "key", "api_key", "authorization",
  "cookie", "session", "email", "card", "ssn", "access_token",
  "refresh_token", "private_key", "encryption_key",
])

function sanitizeValue(key: string, value: unknown): unknown {
  const k = key.toLowerCase()
  if (SENSITIVE_FIELDS.has(k)) return "[REDACTED]"
  if (value && typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>)
  }
  return value
}

export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = sanitizeValue(key, value)
  }
  return result
}

export function logError(logger: winston.Logger, error: Error, context?: Record<string, unknown>) {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    ...(context ? sanitizeObject(context) : {}),
  })
}

export function logRequest(
  logger: winston.Logger,
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  userId?: string
) {
  logger.info("HTTP Request", {
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    userId,
  })
}

export function logAuditEvent(
  logger: winston.Logger,
  event: string,
  userId: string,
  details: Record<string, unknown>,
  severity: "low" | "medium" | "high" | "critical" = "low"
) {
  logger.warn(`AUDIT: ${event}`, {
    event,
    userId,
    severity,
    details,
    timestamp: new Date().toISOString(),
  })
}

export default logger