/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the specified milliseconds, it rejects with a timeout error.
 *
 * The underlying operation is NOT cancelled (JavaScript cannot cancel
 * in-flight promises), but the caller stops waiting and can return an
 * appropriate error response to the client. The abandoned operation
 * continues to consume resources until it completes.
 *
 * For fetch operations, use createFetchWithTimeout() instead which uses
 * AbortController to actually cancel the underlying request.
 *
 * @param promise - The promise to wrap
 * @param ms - Timeout in milliseconds
 * @returns The resolved value, or rejects with a timeout error
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`))
    }, ms)
    // Clear timer if promise resolves first to avoid orphaned timers
    promise.then(() => clearTimeout(timer), () => clearTimeout(timer))
  })
  return Promise.race([promise, timeoutPromise])
}

/**
 * Classifies an error and returns an appropriate HTTP status code.
 * Network errors (DNS, connection refused, TLS, unreachable host) → 503
 * Timeouts → 504
 * Everything else → 500 (or the error's statusCode if it's an AppError)
 */
export function getErrorStatusCodeFromError(error: unknown): number {
  if (error instanceof Error) {
    // Network errors from fetch-with-timeout wrapper
    if ((error as any).isNetworkError) {
      return 503
    }
    // Timeout errors
    if ((error as any).code === "REQUEST_TIMEOUT" || error.message.includes("timed out")) {
      return 504
    }
    const msg = error.message.toLowerCase()
    if (msg.includes("fetch failed") || msg.includes("network error")) return 503
    if (msg.includes("timed out") || msg.includes("timeout")) return 504
    if (msg.includes("unauthorized") || msg.includes("401")) return 401
    if (msg.includes("forbidden") || msg.includes("403")) return 403
    if (msg.includes("not found") || msg.includes("404")) return 404
    if (msg.includes("conflict") || msg.includes("409")) return 409
    if (msg.includes("rate limit") || msg.includes("429")) return 429
  }
  return 500
}
