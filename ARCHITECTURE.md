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
- Auth endpoints: 5 requests/minute
- Document operations: 30 requests/minute
- General API: 100 requests/minute
- In-memory store (Redis in production)

## Deployment Architecture

### Build
- Next.js 15 with `output: 'standalone'`
- Docker multi-stage build (builder + runner)
- Node.js 24 Alpine

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
