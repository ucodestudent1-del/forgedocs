export const SUPPORTED_API_VERSIONS = ["1"]
export const DEFAULT_API_VERSION = "1"
export const DEPRECATED_API_VERSIONS: string[] = []
export const SUNSET_API_VERSIONS: string[] = []

export interface ApiVersionInfo {
  version: string
  supported: boolean
  deprecated: boolean
  sunset: boolean
}

export function parseApiVersion(headers: Headers): ApiVersionInfo {
  const version = headers.get("api-version") || DEFAULT_API_VERSION
  return {
    version,
    supported: SUPPORTED_API_VERSIONS.includes(version),
    deprecated: DEPRECATED_API_VERSIONS.includes(version),
    sunset: SUNSET_API_VERSIONS.includes(version),
  }
}

export function apiVersionHeaders(version: string): Record<string, string> {
  const headers: Record<string, string> = {
    "API-Version": version,
  }
  if (DEPRECATED_API_VERSIONS.includes(version)) {
    headers["Deprecation"] = "true"
    headers["Sunset"] = `Wed, 01 Jan 2025 00:00:00 GMT`
  }
  return headers
}
