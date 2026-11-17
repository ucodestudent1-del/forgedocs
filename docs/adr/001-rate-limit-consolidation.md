# ADR-001: Consolidate Rate Limiting into Single Redis-Backed Implementation

## Status
Accepted

## Date
2026-11-16

## Authors
Kilo (Principal Software Architect)

## Context
ForgeDocs had two divergent rate-limiting implementations:

1. `src/lib/rate-limit.ts` — used by API routes. Atomic Redis `INCR` but with a per-replica in-memory Map fallback when Redis is unavailable. This fallback allows burst abuse under Redis unavailability and diverges across replicas in multi-instance deployments.
2. `src/lib/rate-limiter.ts` — used by Next.js middleware. Atomic Redis `INCR`, fail-closed when Redis is unavailable, no in-memory fallback.

The divergence caused:
- Inconsistent rate-limit behavior between middleware and API routes
- TOCTOU race conditions from separate `check-then-increment` patterns in `rate-limit.ts`
- Per-replica state allowing attackers to bypass limits by hitting different replicas
- Two code paths to maintain for the same concern

## Decision
Consolidate both implementations into a single canonical module: `src/lib/rate-limiter.ts`.

Key properties of the consolidated implementation:

1. **Single source of truth**: All API routes and middleware import from `@/lib/rate-limiter`. `src/lib/rate-limit.ts` remains as a backward-compatible re-export shim.
2. **Atomic Redis INCR**: Fixed-window rate limiting using Redis `INCR` with TTL, shared across all replicas.
3. **Fail-closed**: When Redis is unavailable, all requests are rejected (HTTP 429). No in-memory fallback.
4. **User-aware identifiers**: API key clients are rate-limited by `x-api-user-id` header (set by middleware); session/unauthenticated clients fall back to IP.
5. **Standardized response headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.

## Consequences

### Positive
- Eliminates TOCTOU race conditions (single atomic check-increment)
- Eliminates per-replica divergence (shared Redis store)
- Fail-closed behavior protects against abuse during Redis outages
- User-aware rate limiting prevents NAT/shared-IP abuse for API key clients
- Single module to maintain

### Negative
- `rate-limit.test.ts` had to be updated (it imports `rateLimit` from `@/lib/rate-limit`, now a re-export)
- `documents.test.ts` mock needed updating from `@/lib/rate-limit` to `@/lib/rate-limiter`
- Existing `rateLimitStore` in-memory export is deprecated (always empty Map)

## Alternatives Considered
1. **Keep both implementations** — Rejected: divergence causes inconsistency and doubles maintenance burden.
2. **Make `rate-limit.ts` canonical** — Rejected: `rate-limiter.ts` already has fail-closed behavior and is used by middleware; it's the stronger implementation.
3. **Add sliding-window rate limiting** — Rejected: fixed-window with Redis INCR is simpler and sufficient; sliding window adds Redis complexity (sorted sets) without clear benefit.

## Related
- ADR-002: API Versioning
- `src/lib/rate-limiter.ts` — canonical implementation
- `src/lib/rate-limit.ts` — backward-compatible re-export shim
