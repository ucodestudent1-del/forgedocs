import { NextResponse } from "next/server"
import {
  parseApiVersion,
  apiVersionHeaders,
  SUPPORTED_API_VERSIONS,
  DEFAULT_API_VERSION,
  type ApiVersionInfo,
} from "@/lib/api-version"

export interface ApiVersionMiddlewareOptions {
  /** Require explicit api-version header (default: false - defaults to DEFAULT_API_VERSION) */
  requireHeader?: boolean
  /** Versions supported by this route (overrides global SUPPORTED_API_VERSIONS) */
  supportedVersions?: string[]
}

/**
 * Higher-order wrapper for Next.js App Router API route handlers.
 * Provides API versioning via the `api-version` request header.
 *
 * Usage:
 *   export const GET = withApiVersion(async (req, versionInfo) => {
 *     return NextResponse.json({ ... })
 *   })
 *
 * For dynamic routes with params:
 *   export const GET = withApiVersion(async (req, versionInfo, { params }) => {
 *     const { id } = await params
 *     return NextResponse.json({ ... })
 *   })
 *
 * The wrapper:
 * 1. Reads the `api-version` header (defaults to DEFAULT_API_VERSION)
 * 2. Rejects unsupported versions with 426 Upgrade Required
 * 3. Adds `API-Version` response header to all responses
 * 4. Adds `Deprecation`/`Sunset` headers for deprecated versions
 * 5. Passes through any extra arguments (e.g. params) after versionInfo
 */
export function withApiVersion(
  handler: (req: Request, versionInfo: ApiVersionInfo, ...extra: any[]) => Promise<NextResponse>,
  options: ApiVersionMiddlewareOptions = {}
) {
  return async (req: Request, ...args: any[]): Promise<NextResponse> => {
    const versionInfo = parseApiVersion(req.headers)
    const supported = options.supportedVersions ?? SUPPORTED_API_VERSIONS

    if (!supported.includes(versionInfo.version)) {
      const response = NextResponse.json(
        {
          error: `Unsupported API version: ${versionInfo.version}`,
          supported_versions: supported,
          default_version: DEFAULT_API_VERSION,
        },
        { status: 426 }
      )
      Object.entries(apiVersionHeaders(versionInfo.version)).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    const response = await handler(req, versionInfo, ...args)

    // Add version headers to all responses
    Object.entries(apiVersionHeaders(versionInfo.version)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    if (versionInfo.version !== DEFAULT_API_VERSION) {
      response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
    }

    return response
  }
}

export { parseApiVersion, apiVersionHeaders, SUPPORTED_API_VERSIONS, DEFAULT_API_VERSION }
export type { ApiVersionInfo }
