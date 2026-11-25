const { createServer } = require("http")
const { parse } = require("url")
const next = require("next")

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

// Fail fast if required environment variables are missing or invalid.
// This prevents silent authentication failures and misconfigured deployments.
const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "REDIS_URL",
  "MFA_SECRET_ENCRYPTION_KEY",
  "MFA_BACKUP_CODE_PEPPER",
]

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key] || process.env[key].includes("placeholder"))
if (missing.length > 0) {
  console.error(
    `Fatal: Missing required environment variables: ${missing.join(", ")}. ` +
      "Please set these before starting the application."
  )
  process.exit(1)
}

let server = null

app.prepare().then(() => {
  server = createServer((req, res) => {
    // Trust Railway's edge proxy headers.
    // Railway terminates TLS at the edge, so the app sees HTTP internally.
    // Override with the forwarded protocol so Next.js knows it's HTTPS.
    const forwardedProto = req.headers["x-forwarded-proto"]
    const forwardedHost = req.headers["x-forwarded-host"]

    if (forwardedProto && forwardedProto !== "http") {
      req.headers["x-forwarded-proto"] = forwardedProto
    } else {
      req.headers["x-forwarded-proto"] = "https"
    }

    if (forwardedHost) {
      req.headers["x-forwarded-host"] = forwardedHost
    }

    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(3000, (err) => {
    if (err) throw err
    console.log("> Ready on http://localhost:3000 (Railway HTTPS proxy)")
  })
})

// Graceful shutdown: stop accepting new connections, finish in-flight requests, then exit
function gracefulShutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully...`)
  if (server) {
    server.close(() => {
      console.log("HTTP server closed")
      process.exit(0)
    })
    // Force exit after 30 seconds if connections don't drain
    setTimeout(() => {
      console.error("Forced exit after graceful shutdown timeout")
      process.exit(1)
    }, 30000)
  } else {
    process.exit(0)
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))
