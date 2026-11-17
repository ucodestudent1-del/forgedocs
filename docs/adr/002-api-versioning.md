# ADR-002: API Versioning via Request Header

## Status
Accepted

## Date
2026-11-16

## Authors
Kilo (Principal Software Architect)

## Context
ForgeDocs API routes are served at `/api/*` with no versioning strategy. Without versioning:
- Breaking changes require coordinating with all clients simultaneously
- No deprecation path for old API versions
- No way to signal version mismatches to clients
- `src/lib/api-version.ts` existed as a utility but was not enforced anywhere

## Decision
Implement API versioning at the Next.js middleware level using the `api-version` request header.

Key properties:

1. **Header-based negotiation**: Clients send `api-version` header; default is `1` when absent.
2. **Middleware enforcement**: `src/middleware.ts` validates the version on every request. Unsupported versions return `426 Upgrade Required` immediately.
3. **Response headers**: All responses include `API-Version`. Deprecated versions include `Deprecation` and `Sunset` headers.
4. **Route-level wrapper**: `src/lib/api-version-middleware.ts` exports `withApiVersion()` for route handlers that need access to the negotiated version info.
5. **Current supported version**: `1`.

## Consequences

### Positive
- Clear deprecation path: deprecated versions return `426` with `supported_versions` in the body
- Clients can pin to a specific version via header
- Single enforcement point in middleware (no per-route changes required)
- Standard HTTP semantics (426 Upgrade Required, Deprecation/Sunset headers)
- Version headers on all responses for observability

### Negative
- Route handlers cannot access version info unless wrapped with `withApiVersion()` (available when needed)
- Non-API routes also receive version headers (harmless)

## Alternatives Considered
1. **URL prefix versioning** (`/api/v1/*`) — Rejected: requires URL rewrites, breaks existing client URLs, complicates caching.
2. **Query parameter versioning** (`?api-version=1`) — Rejected: less RESTful, easily cached incorrectly, doesn't follow HTTP conventions.
3. **Content negotiation** (`Accept: application/vnd.api+json;version=1`) — Rejected: complex to parse, less discoverable.
4. **Route-level wrapping only** — Rejected: would require modifying 30+ API route files; middleware enforcement provides central protection.

## Related
- ADR-001: Rate Limit Consolidation
- `src/middleware.ts` — version validation at edge
- `src/lib/api-version-middleware.ts` — route-level wrapper utility
- `src/lib/api-version.ts` — version constants and parsing
