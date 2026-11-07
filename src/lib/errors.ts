import { NextResponse } from "next/server"
import { ZodError } from "zod"

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
    public details?: any
  ) {
    super(message)
    this.name = "AppError"
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, "VALIDATION_ERROR", details)
    this.name = "ValidationError"
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED")
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN")
    this.name = "ForbiddenError"
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND")
    this.name = "NotFoundError"
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests", public retryAfter?: number) {
    super(message, 429, "RATE_LIMITED")
    this.name = "RateLimitError"
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT")
    this.name = "ConflictError"
  }
}

export function handleError(error: unknown): Response {
  console.error("Error:", error)

  if (error instanceof AppError) {
    const response: Record<string, any> = {
      error: error.message,
      code: error.code,
    }
    if (error.details) {
      response.details = error.details
    }
    if (error instanceof RateLimitError && error.retryAfter) {
      return new Response(JSON.stringify({
        error: error.message,
        code: error.code,
        retryAfter: error.retryAfter,
      }), {
        status: error.statusCode,
        headers: { "Retry-After": String(error.retryAfter), "Content-Type": "application/json" },
      })
    }
    return new Response(JSON.stringify(response), {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (error instanceof ZodError) {
    return new Response(JSON.stringify({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    ), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (error instanceof Error) {
    const isDev = process.env.NODE_ENV === "development"
    return new Response(JSON.stringify({
      error: isDev ? error.message : "Internal server error",
      code: "INTERNAL_ERROR",
      ...(isDev && { stack: error.stack }),
    }, {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  })
}

export function successResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export function errorResponse(message: string, status = 400, code = "ERROR", details?: any): Response {
  return new Response(JSON.stringify({ error: message, code, details }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

// Async wrapper for API routes
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(new Request(req)))))))))))))))))))
    } catch (error) {
      return handleError(error)
    }
  }
}

// Async wrapper for API routes
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(new Request(req))
    } catch (error) {
      return handleError(error)
    }
  }
}

// Async wrapper for API routes
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req)
    } catch (error) {
      return handleError(error)
    }
  }
}

// Async wrapper for API routes
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req)
    } catch (error) {
      return handleError(error)
    }
  }
}

// Async wrapper for API routes
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req)
    } catch (error) {
      return handleError(error)
    }
  }
}

// Async wrapper for API routes
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req)
    } catch (error) {
      return handleError(error)
    }
  }
}

// Async wrapper for API routes
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req)
    } catch (error) {
      return handleError(error)
    }
  }
}

export function createErrorResponse(
  message: string,
  status: number = 400,
  code: string = "ERROR",
  details?: any
) {
  return new Response(JSON.stringify({ error: message, code, details }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}