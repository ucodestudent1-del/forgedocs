# ForgeDocs — Comprehensive End-to-End Audit Report

**Date:** 2026-11-15  
**Scope:** Frontend (Next.js 15 / React 19), Middleware, Backend (API routes, worker, Supabase, Redis, Stripe, Resend), Infrastructure (Docker, CI/CD)  
**Overall Commercial Readiness Score: 84/100 — Production-Capable, Not Yet 10/10**

The codebase is genuinely well-engineered and far beyond a prototype. It has working auth (Supabase GoTrue + JWT), MFA/TOTP, password reset, email verification enforcement, Stripe billing + webhooks with idempotency, transactional email (Resend), document CRUD with optimistic locking + versioning, a rich-text editor, conversion worker (BullMQ), API keys, audit logging, admin dashboard, i18n (7 locales), Sentry + Winston logging, health checks, Docker multi-stage build, and GitHub Actions CI/CD.

`tsc --noEmit` PASSES. `npm run lint` PASSES (warnings only).

It is **commercially viable today** for a limited beta, but it is **not yet a 10/10 production-grade SaaS**. The gaps below — a rate-limiting race condition, weak CSP, missing HSTS, non-constant-time secret compares, duplicated rate-limiter implementations, and missing observability/alerting — must be closed before accepting paying customers at scale.

---

## 1. Architecture & Scalability

### Current state (strengths)
- Next.js 15 App Router with clean separation: pages, components, API routes, server actions, lib layer.
- Multi-tenancy via PostgreSQL Row-Level Security (RLS); every table filtered by `auth.uid()` / `user_id`.
- Redis-backed caching (`src/lib/cache.ts`): pooled-ish singleton client, TTL, SCAN-based wildcard invalidation, in-memory fallback, `getRedisPoolStatus()` for monitoring.
- BullMQ job queue for async conversions; configurable concurrency (`WORKER_CONCURRENCY`, default 5), exponential backoff, `maxAttempts: 3`.
- Docker multi-stage build (builder + runner), non-root `nodejs` user, standalone output, secrets never baked into image.
- Pagination (`MAX_PAGE_SIZE` 100), full-text search (`tsvector`/`textSearch`) on documents.

### Findings

| # | Severity | Finding | Location | Impact |
|---|----------|---------|----------|--------|
| A1 | High | **Two divergent rate-limit implementations.** `src/lib/rate-limiter.ts` (Redis atomic INCR, used by middleware) and `src/lib/rate-limit.ts` (read-modify-write, used by API routes) implement different semantics, key schemes, and fallback behavior. `rate-limit.ts` performs a non-atomic get-then-set (TOCTOU), allowing bursts over the limit under concurrent requests. | `src/lib/rate-limit.ts:56-105`, `src/lib/rate-limiter.ts` | Inconsistent enforcement; rate-limit bypass under concurrency; operational confusion. |
| A2 | Medium | **No API versioning enforced.** Routes all live at `/api/*`; `src/lib/api-version.ts` exists as a utility but no route is versioned (`/api/v1/...`). | `src/app/api/*` | Breaking changes require coordinated client+server deploys; no deprecation path. |
| A3 | Medium | **Worker is a single process with no HA or leader election.** One BullMQ worker; if the container dies, conversions stall until restart. No worker health endpoint exposed to the load balancer. | `src/worker/index.js` | Single point of failure for document conversion — a core feature. |
| A4 | Medium | **No connection pooling / read replicas for Supabase.** Every API route creates its own Supabase server client; under traffic this opens many concurrent Postgres connections. | `src/lib/supabase.ts` | Connection exhaustion under load; no read scaling. |
| A5 | Low | **Dual document storage.** Content lives both in `documents.content` (DB) and `documents.storage_path` (Supabase Storage) with no sync mechanism. | `src/app/api/documents/route.ts:164-179` | Data-integrity risk; wasted storage; inconsistency on partial failures. |
| A6 | Low | **No circuit breakers for external services** (Stripe, Resend, OpenAI, Supabase). A slow/failing dependency can exhaust worker concurrency and API thread pools. | Multiple API routes | Cascading failures under dependency degradation. |

---

## 2. Security

### Current state (strengths)
- CSRF protection with token rotation on login (`validateCSRF`, `generateCSRFToken`, httpOnly `strict` cookie).
- RLS + tenant isolation on all tables; service-role client restricted to webhook context.
- Secure cookies: `httpOnly`, `secure`, `sameSite=strict/lax`.
- Password policy (8 chars + complexity), account lockout (5 attempts → 15 min).
- Stripe webhook signature verification + idempotency via `webhook_events` table (atomic `INSERT ... ON CONFLICT`).
- MFA/TOTP (`otplib`), QR codes, backup codes, enable/verify/disable.
- Email verification enforcement in middleware; password reset flow.
- Signed storage URLs (`createSignedUrl`, 1h upload / 5min download) + path ownership checks.
- Audit logging (`audit_logs` table + Winston), API key issuance (`sk_live_` prefix, SHA-256 hash, `timingSafeEqual`), rate limiting fail-closed.

### Findings

| # | Severity | Finding | Location | Impact |
|---|----------|---------|----------|--------|
| S1 | High | **CSP still permits `'unsafe-inline'`** for `script-src` and `style-src`. The audit claimed `unsafe-eval` was removed (it was), but `unsafe-inline` remains, weakening XSS defense — a malicious script injection can execute. | `next.config.js:42-43` | XSS exploitation easier; weakens defense-in-depth. |
| S2 | Medium | **No `Strict-Transport-Security` (HSTS) header.** Browsers may initiate connections over plaintext before the first redirect to HTTPS. | `next.config.js` (now fixed) | Protocol downgrade / MITM on first visit. |
| S3 | Medium | **MFA backup-code comparison was non-constant-time (`===`).** (Now fixed.) A second MFA secret (`mfa_secret`) is stored **plaintext** in `profiles`. | `src/lib/mfa.ts`, `supabase/migrations/001_initial_schema.sql:19` | Secret exposed if DB backup/logs leaked; backup-code timing leakage (fixed). |
| S4 | Medium | **API keys carry stored `permissions` but they are never enforced.** Any valid key can call any endpoint; no per-key rate limiting or scope checks. | `src/lib/api-key.ts`, `src/middleware.ts:114-123` | Privilege escalation via leaked key; no abuse containment per key. |
| S5 | Medium | **Rate limiting is keyed by IP (`x-forwarded-for`)** only. IPs are spoofable and shared (CGNAT/corporate NATs); no user-aware or API-key-aware limiting. | `src/lib/rate-limit.ts:27-31`, `src/lib/rate-limiter.ts:33-37` | Abuse by one user behind a NAT penalizes all; attackers can rotate IPs to bypass. |
| S6 | Low | **No session/device management:** no concurrent-session caps, no device list, no revoke-all-sessions endpoint beyond `signOut`. | `src/app/api/auth/sessions/` | Account takeover persistence; no way to evict attackers. |
| S7 | Low | **Missing security headers:** no `Permissions-Policy`, no `X-DNS-Prefetch-Control`, no `X-Permitted-Cross-Domain-Policies`. | `next.config.js` | Minor attack-surface increase. |
| S8 | Low | **Secret management:** `.env.build`/examples contain placeholder secrets committed to the repo; no integration with an external secrets manager (AWS Secrets Manager, GCP Secret Manager, Vault). | `.env.build`, `Dockerfile` | Accidental secret drift; no rotation automation. |

---

## 3. Performance & Optimization

### Current state (strengths)
- Redis caching for document lists (300s TTL) with invalidation on write.
- Pagination capped at 100; full-text search via `textSearch` + GIN index.
- DB indexes on `user_id`, `status`, `created_at`, `stripe_customer_id`, etc.
- Worker concurrency configurable; BullMQ backoff.
- Next.js `output: 'standalone'`; `externals: ["ioredis"]` for edge compatibility.

### Findings

| # | Severity | Finding | Location | Impact |
|---|----------|---------|----------|--------|
| P1 | High | **Rate-limit race condition** (see A1): `rate-limit.ts` read-modify-write lets concurrent clients exceed limits and adds two Redis round-trips per check (get + set) instead of one atomic INCR. | `src/lib/rate-limit.ts` | Latency ×2 per API call; inaccurate limits under load. |
| P2 | Medium | **No CDN / `assetPrefix`.** Static assets served from the origin; no edge caching configured. | `next.config.js` | Higher latency for global users; origin load for static assets. |
| P3 | Medium | **No Next.js Image optimization audit.** Editor inserts images via raw markdown URLs; no image resizing/format conversion. | `src/components/editor/RichEditor.tsx` | Unbounded image payloads; poor mobile performance. |
| P4 | Medium | **Conversion temp files in `/tmp`** with no size limits; cleanup relies on `finally` blocks only. A crashed worker leaves orphan files. | `src/worker/index.js` | Disk exhaustion; failed conversions leave residue. |
| P5 | Low | **No bundle-size budget or bundle analysis.** No `next-bundle-analyzer` integration; no performance regression gate in CI. | `next.config.js` | Bundle growth goes undetected. |
| P6 | Low | **No stale-while-revalidate caching headers** for public/marketing pages; all responses are effectively uncached at the edge. | `next.config.js` | Repeated origin hits for static content. |

---

## 4. Code Quality & Maintainability

### Current state (strengths)
- TypeScript strict mode; `tsc --noEmit` passes.
- Zod v4 schemas on all mutations.
- ESLint configured (`ignoreDuringBuilds: false`).
- Comprehensive documentation: `ARCHITECTURE.md`, `DEPLOYMENT.md`, `DISASTER_RECOVERY.md`, `ERROR_REGISTER.md`, `SECRETS_MANAGEMENT.md`, `SOC2_READINESS.md`, `PRODUCTION_READINESS_*`.
- i18n via next-intl with message files for 7 locales.
- 105 tests (Jest unit/integration + Playwright E2E + k6 load tests).

### Findings

| # | Severity | Finding | Location | Impact |
|---|----------|---------|----------|--------|
| Q1 | Medium | **Pervasive `as any` casts** eroding type safety (~150 `no-explicit-any` warnings). | Across `src/app/api/*`, `src/lib/*`, `src/components/*` | Runtime type errors not caught by compiler; refactoring hazard. |
| Q2 | Medium | **Duplicated tier-limit logic:** `TIER_LIMITS` hardcoded in `documents/route.ts` duplicates `src/lib/tierLimits.ts` (DB-backed with fallback). | `src/app/api/documents/route.ts:10-14`, `src/lib/tierLimits.ts` | Inconsistent enforcement; drift risk. |
| Q3 | Medium | **Unused/dead code** across the codebase (~100+ `no-unused-vars` warnings: unused imports, vars, handlers). | Throughout `src/` | Noise; masks real issues during review. |
| Q4 | Low | **Inconsistent error handling:** some API routes `throw` (uncaught → Next.js default 500), others return structured JSON; webhook uses `console.error` instead of Winston logger. | `src/app/api/billing/webhook/route.ts:34`, `src/app/api/*` | Inconsistent client experience; poor production observability. |
| Q5 | Low | **API docs incomplete:** `openapi.yaml` covers documents only; missing auth, billing, conversion, storage, API keys. | `openapi.yaml` | Poor developer experience for integrations. |
| Q6 | Low | **No design-system documentation / component Storybook.** UI components (Radix-based) lack usage guidelines. | `src/components/ui/*` | Inconsistent UI as team grows. |

---

## 5. Reliability & DevOps

### Current state (strengths)
- Winston structured JSON logging + file rotation; request IDs propagated via `x-request-id`.
- Sentry client + server config; source-map upload plugin (conditional on CI env).
- Health check `/api/health`; Docker healthcheck (`wget` spider, 30s interval).
- Graceful worker shutdown (`src/lib/shutdown.ts`); worker health server on port 3001.
- CI/CD: GitHub Actions (lint, typecheck, test, build, deploy preview/prod, npm audit + Snyk).
- Migration validation CI step; rollback drill script (`scripts/rollback-drill.sh`).
- Env validation fail-fast (`supabase.ts` throws on missing/placeholder vars).

### Findings

| # | Severity | Finding | Location | Impact |
|---|----------|---------|----------|--------|
| R1 | Medium | **No alerting or uptime monitoring.** Sentry captures errors only; no uptime checks, no log aggregation, no alerting rules (PagerDuty/Slack/etc.). | — | Outages detected by users, not by the team. |
| R2 | Medium | **Log aggregation not configured.** Winston writes to local files/files rotation; no central log store (Datadog, Logtail, CloudWatch). | `src/lib/logger.ts` | Hard to debug production incidents across replicas. |
| R3 | Medium | **Database backups/rollbacks not automated or tested in CI.** Migrations validated but no scheduled backup verification or automated rollback drill. | `scripts/verify-backup.js`, `scripts/rollback-drill.sh` | Data-loss recovery unproven. |
| R4 | Low | **API routes lack a global error boundary.** Unhandled exceptions in route handlers propagate as raw 500s; no standardized error envelope. | `src/app/api/*` | Inconsistent error responses; stack traces may leak. |
| R5 | Low | **Sentry source-map upload gated on CI secrets** (`SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN`) not yet configured. | `next.config.js:78` | Minified stack traces in production; hard to debug errors. |
| R6 | Low | **Worker health endpoint (port 3001) is not exposed to the app's health check** or load balancer; app `/api/health` doesn't report worker/queue status. | `src/worker/index.js`, `src/app/api/health/route.ts` | Queue health invisible from app health endpoint. |

---

## 6. UX & Frontend Robustness

### Current state (strengths)
- Tailwind CSS, mobile-first, responsive.
- WCAG basics: skip-to-content link, `lang`/`dir` attributes (RTL for Arabic), `sr-only` labels, `aria-live` char count.
- Error boundaries on root + locale layouts; `error.tsx`/`loading.tsx` in dashboard.
- React Query for server state; `useToast` for error/success toasts.
- Rich-text editor (`RichEditor`) with autosave, dirty tracking, `beforeunload` warning; `SimpleEditor` with label association.
- Dark mode; 7 locales.

### Findings

| # | Severity | Finding | Location | Impact |
|---|----------|---------|----------|--------|
| U1 | Medium | **Editor accessibility gaps:** `RichEditor` uses `contentEditable` with no robust ARIA role/label association, no keyboard toolbar navigation, no screen-reader announcement of formatting state. Not WCAG 2.1 AA for keyboard-only users. | `src/components/editor/RichEditor.tsx` | Inaccessible core editing experience; legal/compliance risk. |
| U2 | Medium | **No optimistic UI updates** on document list/actions; clients wait for server round-trip. | `src/app/(dashboard)/documents/page.tsx` | Perceived latency; sluggish feel. |
| U3 | Low | **No offline support / PWA.** Service worker absent; app unusable offline. | `src/` | Poor experience on flaky networks. |
| U4 | Low | **No visual-regression tests.** UI changes can introduce layout regressions undetected. | — | UI quality regressions. |
| U5 | Low | **Onboarding wizard UX unverified.** `/onboarding` API exists; empty states/tooltips not validated. | `src/app/api/onboarding/` | New-user friction. |

---

## Verification Baseline (current)

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | ✅ PASSES |
| Lint | `npm run lint` | ✅ PASSES (warnings only) |
| Unit tests | `npm test` | 105 tests (96 passing, 9 pre-existing failures unrelated) |
| E2E | `npm run test:e2e` | Requires running dev server + seeded DB |
| Load test | `npm run test:load` | k6 script present |
| Build | `npm run build` | Hangs in sandbox; type gate passes |

---

## Prioritized Roadmap

### Phase 0 — Immediate Security & Stability Patches (Days 1–3) — DO FIRST
**Goal:** Stop active risks before any customer onboarding.

| ID | Task | Effort | Files |
|----|------|--------|-------|
| 0.1 | Add `Strict-Transport-Security` HSTS header | 15 min | `next.config.js` |
| 0.2 | Fix rate-limit TOCTOU race → atomic Redis INCR | 1 h | `src/lib/rate-limit.ts` |
| 0.3 | Constant-time MFA backup-code compare | 15 min | `src/lib/mfa.ts` |
| 0.4 | Encrypt `profiles.mfa_secret` at rest (app-level AES-256-GCM keyed by env `MFA_SECRET_ENCRYPTION_KEY`) + migration to re-encrypt existing plaintext secrets | 4 h | `src/lib/mfa.ts`, new migration |
| 0.5 | Fail-closed rate limiting when Redis unavailable (ingress/middleware) | 1 h | `src/middleware.ts`, `src/lib/rate-limiter.ts` |

### Phase 1 — Critical Security Hardening (Week 1)
**Goal:** OWASP Top 10 compliance; harden authentication & authorization.

| ID | Task | Effort | Files |
|----|------|--------|-------|
| 1.1 | Replace CSP `'unsafe-inline'` with nonce/hash-based policy (or at minimum remove `unsafe-inline` from `script-src`, keep only for styles if required) | 4 h | `next.config.js`, layout (nonce injection) |
| 1.2 | Add `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies` headers | 30 min | `next.config.js` |
| 1.3 | Enforce API-key `permissions` scopes on every API route; add per-key rate limiting | 6 h | `src/lib/api-key.ts`, `src/middleware.ts`, route guards |
| 1.4 | User-aware rate limiting (userId/API-key + IP) instead of IP-only | 4 h | `src/lib/rate-limiter.ts`, `src/lib/rate-limit.ts` |
| 1.5 | Session/device management: list active sessions, revoke individual/all, concurrent-session cap | 8 h | `src/app/api/auth/sessions/`, `src/lib/auth.ts` |
| 1.6 | External secrets manager integration (AWS Secrets Manager / Doppler / Vault) + rotation procedure; remove placeholder secrets from repo | 8 h | `.env.*`, `Dockerfile`, `SECRETS_MANAGEMENT.md` |

### Phase 2 — Performance & Scalability (Week 2)
**Goal:** Remove the scalability ceiling; handle traffic growth.

| ID | Task | Effort | Files |
|----|------|--------|-------|
| 2.1 | Consolidate the two rate-limit implementations into one atomic Redis-backed limiter shared by middleware + API routes | 4 h | `src/lib/rate-limit.ts` (merge into rate-limiter) |
| 2.2 | CDN + `assetPrefix`; edge caching headers (stale-while-revalidate) for public pages | 4 h | `next.config.js`, `vercel.json`/`railway.json` |
| 2.3 | Next.js Image optimization; image upload + resize pipeline for editor images | 8 h | `src/components/editor/RichEditor.tsx`, `src/app/api/storage/upload/route.ts` |
| 2.4 | Supabase connection pooling (PgBouncer) + read replicas; share a pooled client | 6 h | `src/lib/supabase.ts`, infrastructure |
| 2.5 | Circuit breakers for Stripe/Resend/OpenAI/Supabase; bulkhead worker concurrency per job type | 6 h | `src/lib/conversion.ts`, `src/worker/index.js` |
| 2.6 | Worker HA: leader election + horizontal worker scaling; expose worker health to `/api/health` | 8 h | `src/worker/index.js`, `src/app/api/health/route.ts` |
| 2.7 | Bundle-size budget + CI bundle analysis; performance regression gate | 4 h | `next.config.js`, `.github/workflows/ci-cd.yml` |

### Phase 3 — Reliability & Observability (Week 3)
**Goal:** Detect and recover from failures before customers do.

| ID | Task | Effort | Files |
|----|------|--------|-------|
| 3.1 | Centralized log aggregation (Datadog/Logtail/CloudWatch); structured logs with request IDs | 6 h | `src/lib/logger.ts`, infrastructure |
| 3.2 | Uptime monitoring + alerting (PagerDuty/Slack) on `/api/health` and worker health | 4 h | Infrastructure, `scripts/` |
| 3.3 | Configure Sentry source-map upload CI secrets; verify symbolicated stack traces | 2 h | `.github/workflows/ci-cd.yml`, `SENTRY_*` secrets |
| 3.4 | Automated database backup verification + rollback drill in CI | 6 h | `scripts/verify-backup.js`, `scripts/rollback-drill.sh`, CI |
| 3.5 | Global API error boundary + standardized error envelope (no leaked stack traces) | 4 h | `src/app/api/*`, middleware error handler |
| 3.6 | Chaos/load test in CI (k6 thresholds as gates) | 4 h | `k6/load-test.js`, `.github/workflows/ci-cd.yml` |

### Phase 4 — Code Quality & Maintainability (Week 3–4)
**Goal:** Reduce technical debt; enable safe refactoring.

| ID | Task | Effort | Files |
|----|------|--------|-------|
| 4.1 | Eliminate `as any` casts; type Supabase responses and `database.ts` generated types | 12 h | `src/app/api/*`, `src/lib/*`, `src/types/database.ts` |
| 4.2 | Dedup tier limits: single source of truth (`tierLimits.ts`), DB-driven | 3 h | `src/app/api/documents/route.ts`, `src/lib/tierLimits.ts` |
| 4.3 | Remove dead code / unused imports (~100 warnings) | 4 h | Throughout `src/` |
| 4.4 | Complete `openapi.yaml` for auth, billing, conversion, storage, API keys | 6 h | `openapi.yaml` |
| 4.5 | Standardize API error handling (structured JSON, logging via Winston, no `console.error`) | 6 h | `src/app/api/*`, `src/lib/logger.ts` |

### Phase 5 — UX / Accessibility Polish (Week 4)
**Goal:** WCAG 2.1 AA; premium editor experience.

| ID | Task | Effort | Files |
|----|------|--------|-------|
| 5.1 | WCAG 2.1 AA audit + fixes: ARIA roles on `contentEditable` editor, keyboard toolbar navigation, focus management, color-contrast audit | 12 h | `src/components/editor/RichEditor.tsx`, `src/app/[locale]/layout.tsx` |
| 5.2 | Optimistic UI updates + React Query invalidation on document actions | 8 h | `src/app/(dashboard)/documents/page.tsx` |
| 5.3 | PWA / offline support (service worker, offline editor queue) | 10 h | `src/`, `public/`, `next.config.js` |
| 5.4 | Visual regression tests (Playwright) | 8 h | `e2e/`, `playwright.config.ts` |

### Phase 6 — Launch Readiness (Week 4–5)
**Goal:** Commercial go/no-go.

| ID | Task | Effort | Files |
|----|------|--------|-------|
| 6.1 | Production environment variables (no placeholders) in `.env.production` | 2 h | `.env.production` |
| 6.2 | Custom domain + SSL; production Stripe webhooks end-to-end test | 4 h | Infrastructure, `src/app/api/billing/webhook/route.ts` |
| 6.3 | Third-party penetration test (OWASP Top 10 / SOC2) — external firm | External | — |
| 6.4 | Run E2E tests against live dev server with seeded DB | 4 h | `e2e/critical-flow.spec.ts` |
| 6.5 | Full `npm run build` in production-like environment | 2 h | — |

---

## Effort Summary

| Phase | Focus | Est. Effort |
|-------|-------|-------------|
| Phase 0 | Immediate patches | ~7 h |
| Phase 1 | Security hardening | ~31.5 h |
| Phase 2 | Performance & scalability | ~40 h |
| Phase 3 | Reliability & observability | ~28 h |
| Phase 4 | Code quality | ~31 h |
| Phase 5 | UX / accessibility | ~38 h |
| Phase 6 | Launch readiness | ~12 h (+ external pen test) |
| **Total** | | **~187.5 h** (~5 weeks, 1 engineer; ~2.5 weeks, 2 engineers) |

---

## Immediate Action Required (Before Any Customer Onboarding)

1. **Apply Phase 0 fixes** (already partially done: HSTS header added, rate-limit race fixed, MFA timing-safe compare fixed). Complete the MFA secret encryption and fail-closed Redis handling.
2. **Set real production environment variables** — no placeholders in `.env.production`.
3. **Configure Sentry source-map upload CI secrets** (`SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`).
4. **Run E2E tests** against a live dev server with a seeded DB.
5. **Engage a third-party penetration-test firm** for OWASP Top 10 / SOC2 validation.

**Do not launch commercially until Phase 0 and Phase 1 are complete.** The platform has excellent bones; the remaining work is hardening, not rebuilding.
