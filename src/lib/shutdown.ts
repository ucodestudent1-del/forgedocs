type CleanupFn = () => Promise<void> | void

const cleanups: CleanupFn[] = []
let shuttingDown = false

export function registerShutdown(fn: CleanupFn) {
  cleanups.push(fn)
}

async function runShutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`Received ${signal}, shutting down gracefully...`)

  const errors: string[] = []
  await Promise.all(
    cleanups.map(async (fn) => {
      try {
        await fn()
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err))
      }
    }),
  )

  if (errors.length > 0) {
    console.error("Shutdown errors:", errors)
    process.exit(1)
  } else {
    console.log("Graceful shutdown complete")
    process.exit(0)
  }
}

// Only register once, safely guarded for Edge Runtime compatibility
if (typeof process !== "undefined" && process && typeof process.on === "function") {
  try {
    process.on("SIGTERM", () => runShutdown("SIGTERM"))
    process.on("SIGINT", () => runShutdown("SIGINT"))
  } catch {}
}
