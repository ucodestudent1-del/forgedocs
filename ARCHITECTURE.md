# ForgeDocs Architecture Documentation

## Overview

ForgeDocs is a document management, generation, editing, and conversion platform built with Next.js 15, Supabase, and React.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Next.js App Router)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Pages      │  │  Components │  │  API Routes (API)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  documents  │  │  templates  │  │   document_versions │ │
│  │  profiles   │  │  conversion_│  │   audit_log         │ │
│  │             │  │    jobs     │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  Auth (GoTrue)  │  Realtime     │  Storage (S3-compatible) │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Redis (Cache)                            │
│  Document listings, user sessions, rate limiting            │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Document CRUD
1. Client sends authenticated request to `/api/documents`
2. Next.js API route validates CSRF token and rate limit
3. Supabase client queries PostgreSQL with RLS (user_id filtering)
4. Result returned to client

### Document Editor
1. Client loads `/editor?id=<docId>`
2. Page fetches document content from `/api/documents/[id]`
3. User edits in SimpleEditor component
4. Changes saved via `PUT /api/documents/[id]/content`
5. Previous version snapshotted to `document_versions` table

## Security Model

### Authentication
- Supabase Auth (GoTrue) for user management
- JWT-based sessions with HTTP-only cookies
- Secure cookie attributes: `httpOnly`, `secure`, `sameSite=lax`

### Authorization
- Row-Level Security (RLS) on all Supabase tables
- All queries filter by `user_id`
- Cross-tenant access prevented at database level

### Authorization Middleware
- Next.js middleware protects `/dashboard/*` routes
- Unauthenticated users redirected to `/auth/login`

### CSRF Protection
- All mutation endpoints require `X-CSRF-Token` header
- Token generated via `crypto.randomUUID()`
- Validated against cookie-stored token

### Rate Limiting
- Auth endpoints: 5 requests/minute per user/IP
- Document operations: 30 requests/minute per user/IP
- General API: 100 requests/minute per user/IP
- Redis-backed (shared across all replicas, no per-replica divergence)
- Fail-closed: rejects all requests when Redis is unavailable
- User-aware: API key clients rate-limited by `x-api-user-id` header; session/unauthenticated clients by IP
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`

## Deployment Architecture

### Build
- Next.js 15 with `output: 'standalone'`
- Docker multi-stage build (builder + runner)
- Node.js 24 Alpine

### API Versioning
- All API responses include `API-Version` response header
- Clients negotiate version via `api-version` request header (defaults to `1`)
- Unsupported versions return `426 Upgrade Required` with `supported_versions` and `default_version` in the body
- Deprecated versions include `Deprecation` and `Sunset` response headers
- Current supported version: `1`

### API Key Permissions

API keys use least-privilege RBAC with `resource:action` permission format:

- **Permission model**: `Record<string, boolean>` stored on each API key row
- **Wildcard support**: `resource:*` grants all actions on a resource; `*:*` grants everything
- **Fail closed**: Empty/missing permissions deny all access; unknown paths default to `documents:read`
- **Enforcement**: Middleware validates permissions on every API request; insufficient permissions return `403`
- **Auth routes** (`/api/auth/*`, `/api/onboarding/*`, `/api/csrf/*`) are not accessible via API key — session-based only
- **Health endpoint** (`/api/health`) is public

Permission map (path → required permissions):

| Path Pattern | Required Permissions |
|---|---|
| `/api/documents*` | `documents:read` |
| `/api/files*` | `documents:read` |
| `/api/templates*` | `documents:read` |
| `/api/document-generator*` | `documents:write` |
| `/api/conversion*` | `conversion:read`, `conversion:write` |
| `/api/ocr*` | `conversion:read`, `conversion:write` |
| `/api/pdf-tools*` | `conversion:read`, `conversion:write` |
| `/api/billing*` | `billing:read` |
| `/api/usage*` | `billing:read` |
| `/api/activity*` | `audit:read` |
| `/api/audit*` | `audit:read` |
| `/api/storage*` | `documents:read`, `documents:write` |
| `/api/e-signatures*` | `documents:read`, `documents:write` |
| `/api/ai*` | `ai:read`, `ai:write` |
| `/api/admin*` | `admin:*` |
| `/api/auth*`, `/api/onboarding*`, `/api/csrf*` | Not accessible via API key |
| `/api/health` | None (public) |

### Rate Limiting (per API key)

- API key clients are rate-limited by `x-api-key-id` (most granular)
- Falls back to `x-api-user-id`, then IP address
- Redis-backed, shared across all replicas
- Fail-closed when Redis is unavailable

### Deploy
- Railway platform
- Docker container deployment
- Health check endpoint: `/api/health`
- Port: 3000

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
