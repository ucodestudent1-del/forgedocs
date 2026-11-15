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

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "forgedocs" },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === "production" ? "warn" : "debug",
    }),
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
    }),
  ],
})

// Create a child logger with request context
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({ requestId, userId })
}

export function logError(logger: winston.Logger, error: Error, context?: Record<string, unknown>) {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    ...context,
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