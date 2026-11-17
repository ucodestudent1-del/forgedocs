# ADR-003: API Key Permissions Enforcement (Least-Privilege RBAC)

## Status
Accepted

## Date
2026-11-17

## Authors
Kilo (Principal Software Architect)

## Context
ForgeDocs API keys had a `permissions` field (`Record<string, unknown>`) in the `api_keys` table, but middleware never checked it. Any valid API key granted full access to all API endpoints, violating least-privilege and creating a privilege escalation risk if a key was leaked.

## Decision
Enforce API key permissions at the middleware level using `resource:action` permission format.

### Permission model
- Each API key row stores `permissions: Record<string, boolean>`
- Permissions use `resource:action` format (e.g., `documents:read`, `conversion:write`)
- Wildcard support: `resource:*` grants all actions on a resource; `*:*` grants everything
- Empty/missing permissions deny all access (fail closed)
- Unknown API paths default to requiring `documents:read`

### Enforcement point
Next.js middleware (`src/middleware.ts`) validates permissions on every API request that uses Bearer token authentication:
1. `validateApiKey()` returns the key row including `permissions`
2. `requiresApiKeyPermission(pathname)` maps the request path to required permissions
3. `checkApiKeyPermissions()` verifies the key has all required permissions
4. Insufficient permissions return `403 Forbidden` with `required` and `missing` fields

### Routes excluded from API key access
- `/api/auth/*` — session-based authentication only
- `/api/onboarding/*` — session-based only
- `/api/csrf/*` — session-based only
- `/api/health` — public (no permission required)

### Rate limiting integration
Per-key rate limiting uses `x-api-key-id` header (set by middleware after key validation) as the rate-limit identifier, falling back to `x-api-user-id`, then IP. Each API key has an independent rate-limit counter in Redis.

## Consequences

### Positive
- Least-privilege access: leaked keys only grant their scoped permissions
- Fail closed: misconfigured or empty-permission keys deny all access
- Centralized enforcement: single middleware check covers all API routes
- Clear error responses: 403 includes `required` and `missing` permissions for client debugging
- Per-key rate limiting: prevents one key from exhausting another key's quota

### Negative
- Existing API keys with empty permissions will lose all access until permissions are granted
- Middleware adds a permission-check lookup per API key request (negligible overhead)
- Client applications must be updated to request appropriate permissions when creating keys

## Alternatives Considered
1. **Route-level permission checks** — Rejected: would require modifying 30+ API route files; middleware provides central protection.
2. **JWT scopes in Supabase** — Rejected: API keys use a separate table from Supabase Auth; adding JWT claims would couple two independent auth systems.
3. **Resource-level permissions (document_id specific)** — Rejected: row-level security (RLS) already handles document-level isolation at the database layer; API key permissions are coarse-grained gateway control.

## Related
- ADR-001: Rate Limit Consolidation
- ADR-002: API Versioning
- `src/lib/api-key.ts` — `checkApiKeyPermissions()`, `requiresApiKeyPermission()`
- `src/middleware.ts` — permission enforcement in API route handler
