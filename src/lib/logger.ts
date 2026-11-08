import { createLogger } from "pino"

const logger = createLogger({
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
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID()
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
        error: error.message,
        durationMs: Date.now() - start,
      }, "request failed")
      throw error
    }
  }
}
