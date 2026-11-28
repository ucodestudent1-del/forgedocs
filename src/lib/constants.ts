/**
 * Centralized configuration constants
 * Single source of truth for magic strings, paths, and configuration values
 */

export const CONFIG = {
  // Storage configuration
  storage: {
    tempDir: process.env.TEMP_DIR || "/tmp",
    tempPrefix: "forge-conversion-",
    maxFileSize: 50 * 1024 * 1024, // 50MB
    buckets: {
      documents: "documents",
      converted: "converted",
    },
  },

  // Redis configuration
  redis: {
    leaderLockKey: "forge:worker:leader",
    leaderLockTtlMs: 15000,
    leaderRenewIntervalMs: 5000,
    tierLimitTtlSeconds: 60 * 1000, // 1 minute cache for tier limits
    slidingWindowTtlBuffer: 60, // extra seconds for TTL
  },

  // Queue configuration
  queues: {
    documentConversion: "document-conversion",
    webhookDelivery: "webhook-delivery",
    dlq: "document-conversion-dlq",
    defaultJobOptions: {
      documentConversion: {
        attempts: 3,
        removeOnComplete: { count: 100, age: 24 * 60 * 60 * 1000 },
        removeOnFail: { count: 50, age: 7 * 24 * 60 * 60 * 1000 },
      },
      webhookDelivery: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { count: 50, age: 60 * 60 * 1000 },
        removeOnFail: { count: 200, age: 24 * 60 * 60 * 1000 },
      },
      dlq: {
        attempts: 1,
        removeOnComplete: { count: 1000, age: 24 * 60 * 60 * 1000 },
        removeOnFail: { count: 1000, age: 7 * 24 * 60 * 60 * 1000 },
      },
    },
  },

  // Auth configuration
  auth: {
    protectedRoutes: ["/dashboard", "/editor", "/billing", "/settings"],
    guestUserId: process.env.GUEST_USER_ID,
    mutatingGetPaths: [
      "/api/auth/callback",
      "/api/webhooks/verify",
      "/api/stripe/webhook",
    ],
    csrfMethods: new Set(["POST", "PUT", "PATCH", "DELETE"]),
  },

  // Rate limiting configuration
  rateLimit: {
    configs: {
      "/api/contact": { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: "contact" },
      "/api/auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 10, keyPrefix: "login" },
      "/api/auth/signup": { windowMs: 60 * 60 * 1000, maxRequests: 5, keyPrefix: "signup" },
      "/api/auth/forgot-password": { windowMs: 60 * 60 * 1000, maxRequests: 3, keyPrefix: "forgot" },
      "/api/auth/reset-password": { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: "reset" },
      "/api/auth/mfa/verify": { windowMs: 5 * 60 * 1000, maxRequests: 10, keyPrefix: "mfa" },
      "/api/conversion": { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: "conversion" },
      "/api/pdf-tools/process": { windowMs: 60 * 1000, maxRequests: 10, keyPrefix: "pdf" },
      "/api/ai/assistant": { windowMs: 60 * 1000, maxRequests: 20, keyPrefix: "ai" },
      "/api/ai/chat": { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: "ai-chat" },
      "/api/e-signatures/send": { windowMs: 60 * 1000, maxRequests: 5, keyPrefix: "esign" },
      "/api/documents": { windowMs: 60 * 1000, maxRequests: 100, keyPrefix: "docs" },
      "/api/templates": { windowMs: 60 * 1000, maxRequests: 50, keyPrefix: "templates" },
    },
    apiKeyMultiplier: 20,
    failOpen: false,
  },

  // Tier limits defaults
  tierLimits: {
    default: {
      documents_per_month: 500,
      conversions_per_month: 100,
      storage_gb: 5,
      max_file_size_mb: 10,
      api_requests_per_minute: 30,
      has_priority_support: false,
      has_audit_logs: true,
      has_advanced_templates: false,
      max_seats: 1,
    },
    pro: {
      documents_per_month: 5000,
      conversions_per_month: 1000,
      storage_gb: 50,
      max_file_size_mb: 50,
      api_requests_per_minute: 100,
      has_priority_support: true,
      has_audit_logs: true,
      has_advanced_templates: true,
      max_seats: 5,
    },
    business: {
      documents_per_month: -1,
      conversions_per_month: -1,
      storage_gb: 100,
      max_file_size_mb: 100,
      api_requests_per_minute: 500,
      has_priority_support: true,
      has_audit_logs: true,
      has_advanced_templates: true,
      max_seats: -1,
    },
    tierLimitsCacheTtl: 60 * 1000, // 1 minute
    slidingWindowDays: 30,
  },

  // Worker configuration
  worker: {
    maxConversionFileSize: 50 * 1024 * 1024, // 50MB
    maxTmpDiskUsageMb: 512, // 512MB
    diskCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
    cleanupTempPrefix: "forge-conversion-",
    allowedLibreOfficeFormats: new Set([
      "pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt", "odt", "ods", "odp",
      "rtf", "txt", "html", "md", "epub",
    ]),
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
    healthPort: parseInt(process.env.WORKER_HEALTH_PORT || "3001", 10),
  },

  // OCR configuration
  ocr: {
    maxJobsPerWorker: 100,
    defaultLanguage: "eng",
  },

  // Circuit breaker configuration
  circuitBreaker: {
    stripe: { failureThreshold: 5, resetTimeoutMs: 30000, timeoutMs: 10000 },
    resend: { failureThreshold: 5, resetTimeoutMs: 30000, timeoutMs: 10000 },
    openai: { failureThreshold: 5, resetTimeoutMs: 30000, timeoutMs: 30000 },
    supabase: { failureThreshold: 10, resetTimeoutMs: 15000, timeoutMs: 10000 },
  },

  // Webhook configuration
  webhook: {
    maxRetries: 3,
    deadlineMs: 30000,
    initialBackoffMs: 1000,
    maxBackoffMs: 30000,
    deliveryTimeoutMs: 10000,
    queueConcurrency: 10,
    alertFailureThreshold: 10,
  },

  // Audit configuration
  audit: {
    maxRetryQueue: 1000,
    retryQueueCompactThreshold: 100,
  },

  // Password configuration
  password: {
    minLength: 8,
    maxLength: 128,
  },

  // Body size limits
  bodySize: {
    maxApiRequest: 10 * 1024 * 1024, // 10MB
    maxUpload: 50 * 1024 * 1024, // 50MB
  },

  // Security headers
  security: {
    csp: {
      defaultSrc: "'self'",
      scriptSrc: "'self' 'nonce-{nonce}'",
      styleSrc: "'self' 'nonce-{nonce}'",
      imgSrc: "'self' data: https:",
      fontSrc: "'self'",
      connectSrc: "'self' https: wss:",
      frameAncestors: "'none'",
      baseUri: "'self'",
      formAction: "'self'",
    },
    cspReportOnly: {
      defaultSrc: "'self'",
      scriptSrc: "'self' https:",
      styleSrc: "'self' https:",
      imgSrc: "'self' data: https:",
      fontSrc: "'self' https:",
      connectSrc: "'self' https: wss:",
      frameAncestors: "'none'",
      baseUri: "'self'",
      formAction: "'self'",
      reportUri: "/api/csp-report",
    },
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    },
  },
} as const

// Type helpers for type-safe access
export type Config = typeof CONFIG
export type StorageConfig = typeof CONFIG.storage
export type RedisConfig = typeof CONFIG.redis
export type QueueConfig = typeof CONFIG.queues
export type AuthConfig = typeof CONFIG.auth
export type RateLimitConfig = typeof CONFIG.rateLimit
export type TierLimitsConfig = typeof CONFIG.tierLimits
export type WorkerConfig = typeof CONFIG.worker
export type OcrConfig = typeof CONFIG.ocr
export type CircuitBreakerConfig = typeof CONFIG.circuitBreaker
export type WebhookConfig = typeof CONFIG.webhook
export type AuditConfig = typeof CONFIG.audit
export type SecurityConfig = typeof CONFIG.security