import { randomUUID } from "crypto"
import pino from "pino"

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
})

export { logger }

export function withRequestId(handler: (req: Request, requestId: string) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const requestId = req.headers.get("x-request-id") || randomUUID()
    const start = Date.now()

    logger.info({ requestId, method: req.method, path: req.url }, "request started")

    try {
      const response = await handler(req, requestId)
      logger.info({
        requestId,
        method: req.method,
        path: req.url,
        status: response.status,
        durationMs: Date.now() - start,
      }, "request completed")
      return response
    } catch (error) {
      logger.error({
        requestId,
        method: req.method,
        path: req.url,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      }, "request failed")
      throw error
    }
  }
}
