import logger from "@/lib/logger"

/**
 * Creates a fetch wrapper with timeout and enhanced error reporting.
 * Wraps Node's native fetch to add:
 * - Timeout via AbortController (prevents hanging requests)
 * - Classification of network errors (DNS, connection refused, TLS, timeout)
 * - Meaningful error messages with the target URL
 * - Status codes appropriate for network failures (503, 504)
 *
 * @param timeoutMs - Request timeout in milliseconds (default: 10000)
 * @returns A fetch-compatible function
 */
export function createFetchWithTimeout(timeoutMs: number = 10000) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const inputString = typeof input === "string" ? input : input instanceof URL ? input.toString() : String(input)

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })
      return response
    } catch (error) {
      clearTimeout(timeoutId)

      // Timeout occurred
      if (error instanceof DOMException && error.name === "AbortError") {
        const timeoutError = new Error(
          `Request timed out after ${timeoutMs}ms: ${inputString}`,
        )
        ;(timeoutError as any).code = "REQUEST_TIMEOUT"
        ;(timeoutError as any).statusCode = 504
        ;(timeoutError as any).isNetworkError = true
        ;(timeoutError as any).endpoint = inputString
        logger.error("Request timeout", {
          endpoint: inputString,
          timeoutMs,
          error: timeoutError.message,
        })
        throw timeoutError
      }

      // Network-level failure (DNS, connection refused, TLS, unreachable host)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        const networkError = new Error(
          `Network error: unable to reach ${inputString}`,
        )
        ;(networkError as any).code = "NETWORK_ERROR"
        ;(networkError as any).statusCode = 503
        ;(networkError as any).isNetworkError = true
        ;(networkError as any).endpoint = inputString
        ;(networkError as any).cause = error
        logger.error("Network error reaching upstream service", {
          endpoint: inputString,
          error: error.message,
          cause: error instanceof Error ? error.stack : undefined,
        })
        throw networkError
      }

      // Re-throw unknown errors unchanged
      throw error
    }
  }
}
