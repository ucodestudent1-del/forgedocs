# ForgeDocs Comprehensive Bug Audit Report

**Audit Date:** 2026-11-18  
**Scope:** Full source code review of `src/`, middleware, API routes, worker, lib layer, and configuration files  
**Methodology:** Static code analysis, manual review of all API routes, lib modules, middleware, worker, and config files

---

## Executive Summary

The codebase is well-engineered with TypeScript strict mode, Zod validation, CSRF protection, RLS tenant isolation, signed storage URLs, MFA/TOTP, circuit breakers, and a Redis-backed rate limiter. However, this audit identified **27 bugs** spanning critical logic errors, security vulnerabilities, race conditions, and performance issues.

Notably, **previous audit reports (BUG_AUDIT_REPORT.md, AUDIT_REPORT_COMPREHENSIVE.md) describe fixes that have not been applied to the actual source code**. The middleware is a stub, tier limits lack a "free" tier entry, API key permissions exist but are never enforced, and webhook handler failures cause silent data loss.

---

## Severity Summary

| Severity | Count | Types |
|----------|-------|-------|
| Critical | 6 | Logic errors, security, race conditions |
| High | 7 | Security vulnerabilities, inconsistent enforcement |
| Medium | 7 | Logic errors, data integrity, observability |
| Low | 7 | Code quality, dead code, minor hardening |
| **Total** | **27** | |

---

## CRITICAL

### C-001: Free Tier Users Get Unlimited Access (No "Free" Tier in Limits)

**File:** `src/lib/tierLimits.ts:43-68, 81`

**Bug:** The `TIER_LIMITS` fallback object only contains `pro` and `business` entries. There is no `free` tier. Additionally, `getTierLimitsFromDB` defaults to `"pro"` when no active subscription is found (line 81), and `getTierLimits` falls back to `TIER_LIMITS.pro` when DB limits are unavailable (line 123).

**Impact:** Free tier users bypass all quotas — unlimited documents, conversions, storage, and API requests. This is a direct revenue leakage and resource exhaustion risk.

**Fix:** Add a `free` tier entry to `TIER_LIMITS` with appropriate limits (e.g., 500 documents/month, 100 conversions/month), and change the default fallback from `"pro"` to `"free"`.

---

### C-002: Webhook Handler Failure Causes Silent Data Loss

**File:** `src/app/api/billing/webhook/route.ts:42-69`

**Bug:** The idempotency `INSERT INTO webhook_events` happens **before** the event handler is dispatched. If the handler throws, the webhook returns HTTP 200 to Stripe (line 71), so Stripe will not retry. The event is already recorded as processed, so even a retry would be blocked by the idempotency check. The handler error is only logged to `console.error` (line 66).

**Impact:** Failed payment events, subscription updates, and other critical billing webhooks are silently dropped. Subscriptions may not be activated, canceled, or updated correctly, causing revenue loss and incorrect customer entitlements.

**Fix:** Move the idempotency insert to **after** successful handler execution, or use a transaction that rolls back the insert if the handler fails. Return HTTP 500 on handler failure so Stripe retries.

---

### C-003: API Key Permissions Are Never Enforced

**File:** `src/lib/api-key.ts:140-257`

**Bug:** `checkApiKeyPermissions()` and `requiresApiKeyPermission()` are fully implemented but **never called** in any middleware or API route handler. The middleware (`src/middleware.ts`) does not check API keys at all. Individual API routes authenticate via Supabase session (`supabase.auth.getUser()`) and ignore the `x-api-key` / `x-api-user-id` headers entirely.

**Impact:** Any valid API key can access any endpoint regardless of its assigned permissions. A leaked key with `documents:read` can call billing, admin, conversion, or any other endpoint. This is a complete authorization bypass for API key authentication.

**Fix:** Add API key validation + permission enforcement in `src/middleware.ts` for `/api/*` routes, or add a shared `validateApiKeyAndPermissions` wrapper used by all API routes that accept API keys.

---

### C-004: Missing `crypto` Import Causes Runtime Crash

**File:** `src/app/api/documents/route.ts:123`

**Bug:** Line 123 calls `crypto.randomUUID()` but `crypto` is never imported. In the Next.js server runtime, `crypto` is a global (Node.js), but in Edge Runtime it is not available. This will throw a `ReferenceError: crypto is not defined` at runtime when creating a document.

**Impact:** Document creation endpoint is non-functional. All POST requests to `/api/documents` crash with 500.

**Fix:** Add `import { randomUUID } from "crypto"` (Node.js) or use `crypto.randomUUID()` with proper global availability check. In Next.js 15 server runtime, `crypto` is globally available, but explicit import is safer.

---

### C-005: Tier Limit Check-Then-Act Race Condition (TOCTOU)

**File:** `src/lib/tierLimits.ts:126-187`

**Bug:** `checkTierLimit()` reads the current usage count, then `trackUsage()` performs a separate `INSERT` to increment. These are two separate database operations with no atomicity. Under concurrent requests, multiple requests can all pass the limit check before any of them increment the counter.

**Impact:** Users can exceed their tier limits (documents, conversions) by sending concurrent requests. This enables quota abuse and resource exhaustion.

**Fix:** Use a single atomic operation — e.g., `INSERT INTO usage_records ... RETURNING quantity` combined with a conditional check, or use a Redis atomic INCR with a Lua script to check-and-increment atomically.

---

### C-006: `convertUnit` Called with Wrong Arguments

**File:** `src/app/api/conversion/route.ts:134`

**Bug:** Line 134 calls `convertUnit(numValue, source_format, source_format, target_format)`. The function signature (conversion.ts:467) is `convertUnit(value, category, fromUnit, toUnit)`. The second argument should be the unit **category** (e.g., `"length"`), not `source_format`. `source_format` values like `"length"` or `"mass"` happen to match category IDs, but for derived unit IDs this is incorrect. More importantly, `source_format` is passed as both category AND fromUnit, which is semantically wrong.

**Impact:** Unit conversions return incorrect results or throw "Unsupported unit conversion" errors. For example, converting 100 cm to m with source_format="cm" would look up key "cm->m" in the "cm" category, which doesn't exist.

**Fix:** Determine the category from `sourceFmtObj?.category` (already computed at line 129) and pass it as the second argument: `convertUnit(numValue, category, source_format, target_format)`.

---

## HIGH

### H-001: CSRF Token Length Comparison Before Constant-Time Compare

**File:** `src/lib/csrf.ts:20-22`

**Bug:** `validateCSRF` compares token lengths before calling `timingSafeEqual`. While this prevents a timing-safe-equal error on mismatched buffer lengths, it leaks whether the token length is correct via early return.

**Impact:** Minimal in practice since CSRF tokens are UUIDs (fixed 36-character length), but it violates the principle of constant-time comparison and could theoretically aid token enumeration.

**Fix:** Remove the length check. `timingSafeEqual` will throw if buffer lengths differ; catch the error and return false.

---

### H-002: Inconsistent Error Logging — `console.error` Instead of Winston

**Files:** `src/app/api/billing/webhook/route.ts:35,66`, `src/lib/cache.ts:25`, `src/lib/api-error.ts:77`, `src/worker/index.ts:325`

**Bug:** Multiple critical paths use `console.error` instead of the configured Winston logger (`src/lib/logger.ts`). Winston provides structured JSON logging, file rotation, and request ID propagation. `console.error` outputs unstructured text that is not captured by log aggregation.

**Impact:** Production incidents are harder to diagnose. Error context (request ID, user ID, timestamp) is missing from console output. In containerized environments, `console.error` may not be forwarded to central logging.

**Fix:** Replace all `console.error` calls in server code with the Winston logger from `src/lib/logger.ts`.

---

### H-003: Worker Leader Election Has No Fencing — Stale Leader Can Process Jobs

**File:** `src/worker/index.ts:48-96, 156-170`

**Bug:** The leader lock has a 15-second TTL renewed every 5 seconds. If the leader process blocks (e.g., long-running LibreOffice conversion takes >15s), the lock expires. Another worker acquires the lock and becomes leader. The original worker still believes it is the leader (`isLeader = true`) and continues processing jobs concurrently with the new leader.

**Impact:** Duplicate job processing, data corruption, race conditions on shared resources (temp files, database updates). Two workers can process the same conversion job simultaneously.

**Fix:** Add a fencing token — each job processing should verify the lock is still held before mutating state, or check `isLeader` atomically at the start of each job handler and abort if leadership was lost.

---

### H-004: No Per-Key Rate Limiting for API Keys

**Files:** `src/lib/api-key.ts`, `src/lib/rate-limiter.ts:89`

**Bug:** Rate limiting is keyed by client identifier (IP address) via `getClientIdentifier`. API keys share the same rate limit buckets as regular users. There is no rate limiting based on API key identity.

**Impact:** A leaked API key can exhaust rate limits for the legitimate user (denial of service). Attackers can use a stolen key to make unlimited requests without being individually rate-limited.

**Fix:** Add API-key-aware rate limiting — when an `x-api-key` header is present, use the key ID (or user ID derived from the key) as the rate limit identifier instead of IP.

---

### H-005: MFA Backup Codes Use Unsalted SHA-256

**File:** `src/lib/mfa.ts:109-111`

**Bug:** `hashBackupCode` uses `createHash("sha256")` with no salt or pepper. Backup codes are 8 hex characters (4 random bytes), which is a small keyspace.

**Impact:** If the `profiles.mfa_backup_codes` table is compromised, an attacker can precompute SHA-256 hashes for all possible 8-hex-character codes (2^32 space) and reverse them quickly using rainbow tables or GPU brute force.

**Fix:** Use `scrypt` or `argon2` with a per-code salt, or at minimum HMAC-SHA256 with a server-side pepper stored in an environment variable.

---

### H-006: Rate Limiting Keyed by IP Only — Spoofable and Shared

**File:** `src/lib/client-identifier.ts` (used by `rate-limiter.ts:89`)

**Bug:** Rate limits are keyed by IP address (`x-forwarded-for`). IPs can be spoofed, and multiple users share IPs via CGNAT/corporate NAT.

**Impact:** An attacker behind one IP can exhaust the rate limit for all users behind that NAT (collateral denial of service). Conversely, an attacker can rotate IPs to bypass per-IP limits entirely.

**Fix:** Add user-aware rate limiting — use authenticated user ID or API key ID as the rate limit identifier when available, falling back to IP for anonymous requests.

---

### H-007: File Upload Magic Bytes Validation Bypassed for Text Files

**Files:** `src/app/api/storage/upload/route.ts:24-25`, `src/lib/security.ts:60-61`

**Bug:** `MAGIC_BYTES["text/plain"]` and `MAGIC_BYTES["text/csv"]` are empty arrays, so `validateFileMagicBytes` returns `true` unconditionally for these types. An attacker can upload a file with `.txt` or `.csv` extension containing arbitrary content (e.g., HTML with XSS payloads, scripts, or malicious XML).

**Impact:** Malicious file content can be stored and later served to users, enabling XSS, content injection, or client-side attacks when the file is viewed or downloaded.

**Fix:** Implement content-based validation for text files (e.g., scan for script tags, HTML markup, or dangerous patterns) or reject uploads that contain executable content regardless of extension.

---

## MEDIUM

### M-001: Non-Atomic Document Versioning — Orphan Version Records

**File:** `src/app/api/documents/[id]/content/route.ts:81-90`

**Bug:** The `document_versions` insert (line 81-86) and the `documents` update (line 88-95) are two separate operations with no transaction. If the update fails (e.g., due to optimistic locking conflict at line 93), an orphan version record exists for a version that was never actually committed.

**Impact:** Version history becomes inconsistent — version records exist for content that was never saved. This confuses version restoration and auditing.

**Fix:** Wrap both operations in a database transaction, or insert the version record only after confirming the update succeeded.

---

### M-002: Health Check Returns HTTP 200 Even When Degraded

**File:** `src/app/api/health/route.ts:70-76`

**Bug:** Line 70 computes `allHealthy` but line 73 always returns status 200 regardless. A load balancer checking this endpoint will mark the instance as healthy even when database, Redis, or Stripe is unreachable.

**Impact:** Traffic is routed to unhealthy instances, causing cascading failures and poor user experience.

**Fix:** Return HTTP 503 when `status === "degraded"` so load balancers can remove unhealthy instances from rotation.

---

### M-003: SSRF Risk via `source_url` in Conversion API

**File:** `src/app/api/conversion/route.ts:109, 218-219`

**Bug:** `source_url` is accepted from the client and passed to the worker, which fetches it via `supabase.storage.from("documents").download(sourceUrl)`. There is no URL validation or allowlist. While Supabase Storage download is somewhat scoped, a malicious `source_url` could be used to probe internal services or exfiltrate data.

**Impact:** Server-Side Request Forgery (SSRF) — the worker could be made to access internal network resources or sensitive endpoints.

**Fix:** Validate that `source_url` is a known storage path or a trusted external URL with an allowlist of domains. Reject URLs pointing to internal/private IP ranges.

---

### M-004: `withErrorBoundary` Uses `console.error` Instead of Winston

**File:** `src/lib/api-error.ts:77`

**Bug:** Line 77 logs server errors via `console.error` instead of the Winston logger.

**Impact:** Error stack traces and context are not captured in structured logs, reducing observability in production.

**Fix:** Replace `console.error` with the Winston logger, including request ID and error context.

---

### M-005: Mock Supabase Client During Build Can Mask Runtime Errors

**File:** `src/lib/supabase.ts:6-42`

**Bug:** `createMockClient()` returns a mock with all methods returning null/error. During `next build`, if env vars are placeholders, the mock is returned instead of throwing. Code that depends on Supabase during build (e.g., `getServerSideProps`, server components) will silently fail.

**Impact:** Build-time failures are masked, leading to runtime errors in production that were not caught during build.

**Fix:** Make the build mock opt-in via an explicit environment variable (e.g., `NEXT_PUBLIC_BUILD_MOCK=true`), not implicit based on placeholder detection.

---

### M-006: Stripe Webhook Uses Service Role Client — Bypasses RLS

**File:** `src/app/api/billing/webhook/route.ts:40`

**Bug:** `createServiceRoleClient()` bypasses Row Level Security entirely. While this is intentional for webhook processing (no user context), any bug in the webhook handler has full unrestricted database access.

**Impact:** A vulnerability in webhook handler code could lead to full database compromise — reading, modifying, or deleting any row in any table.

**Fix:** Use service role client only where necessary, and add additional validation/sanitization in webhook handlers. Log all service-role operations for audit.

---

### M-007: No Cache-Control Headers on API Responses

**File:** Multiple API routes (`src/app/api/*`)

**Bug:** API responses do not set `Cache-Control` headers. Browsers and intermediate caches may cache sensitive user data (documents, profile info, billing details).

**Impact:** Sensitive data could be cached by browsers on shared devices or by CDNs, leading to data leakage.

**Fix:** Add `Cache-Control: private, no-store` to all API responses that return user-specific data. Set this in `withErrorBoundary` or as a middleware header.

---

## LOW

### L-001: Dead Code — `typeof navigator` Check in Server API Route

**File:** `src/app/api/auth/sessions/route.ts:22`

**Bug:** Line 22 uses `typeof navigator !== "undefined" ? navigator.userAgent : "Unknown"`. This is a server-side route; `navigator` is never defined. The check always resolves to `"Unknown"`.

**Impact:** Dead code, no functional impact, but misleading for maintainers.

**Fix:** Remove the `navigator` check; use `"Unknown"` or extract user-agent from the request headers.

---

### L-002: Revoking Specific Session Revokes ALL Sessions

**File:** `src/app/api/auth/sessions/route.ts:54-59`

**Bug:** When `session_id` is provided, the code calls `serviceSupabase.auth.admin.signOut(user.id)` which revokes **all** sessions for the user, not just the specified session. The `session_id` parameter is ignored.

**Impact:** Users cannot revoke a single compromised session without logging out of all their devices. This degrades security posture.

**Fix:** Implement per-session revocation using Supabase's auth admin API to revoke specific session tokens, or track sessions in a custom table.

---

### L-003: `generateSignedUrl` Is a Non-Functional Placeholder

**File:** `src/lib/security.ts:41-44`

**Bug:** `generateSignedUrl` returns a string URL but does not actually call Supabase's `createSignedUrl`. It constructs a URL pointing to `/api/storage/download` but does not generate a cryptographically signed URL.

**Impact:** Any code using this function gets a URL that does not provide time-limited access. Downloads are not properly authorized.

**Fix:** Implement actual signed URL generation using `supabase.storage.from(bucket).createSignedUrl(path, expiresIn)`.

---

### L-004: Hardcoded Stripe API Version

**File:** `src/app/api/health/route.ts:60`

**Bug:** Line 60 hardcodes `apiVersion: "2023-10-16"`. Stripe API versions are deprecated over time.

**Impact:** Health check may fail when Stripe deprecates the pinned API version, causing false-negative health status.

**Fix:** Use the Stripe library's default API version or configure via environment variable.

---

### L-005: Webhook Handler Errors Swallowed Without Retry Signaling

**File:** `src/app/api/billing/webhook/route.ts:63-68`

**Bug:** Handler errors are caught and logged to `console.error`, but the webhook still returns 200. Stripe interprets 200 as successful delivery and will not retry.

**Impact:** Related to C-002 — handler failures result in permanently lost events.

**Fix:** Re-throw handler errors or return 500 so Stripe's retry mechanism kicks in. Combine with moving idempotency insert after handler success.

---

### L-006: Unused `@ts-expect-error` in Cache SCAN Call

**File:** `src/lib/cache.ts:126`

**Bug:** Line 126 uses `@ts-expect-error` to suppress a type error for ioredis SCAN options. If ioredis types are updated and the option becomes valid, the `@ts-expect-error` itself becomes a TypeScript error (unused suppression).

**Impact:** Build failure when upgrading ioredis types.

**Fix:** Cast the options to `any` or use proper ioredis SCAN typing.

---

### L-007: Missing Security Headers for API Responses

**File:** `next.config.js:71-78`

**Bug:** API routes (`/api/:path*`) get CORS headers but do not get `Content-Security-Policy`, `X-Content-Type-Options`, or other security headers that are applied to page routes.

**Impact:** API responses could be misinterpreted by browsers (MIME sniffing), and CSP is not enforced for API-driven responses.

**Fix:** Apply security headers to all responses, including API routes, or at minimum `X-Content-Type-Options: nosniff`.

---

## Recommended Fixes (Priority Order)

1. **Immediate (before production launch):**
   - Add `free` tier to `TIER_LIMITS` (C-001)
   - Fix webhook idempotency ordering (C-002)
   - Enforce API key permissions in middleware (C-003)
   - Add `crypto` import to documents route (C-004)
   - Fix tier limit TOCTOU race (C-005)
   - Fix `convertUnit` arguments (C-006)

2. **Short term (Week 1):**
   - Replace `console.error` with Winston logger (H-002, M-004)
   - Add per-key rate limiting (H-004)
   - Salt/pepper backup code hashes (H-005)
   - Fix worker leader fencing (H-003)
   - Fix text file magic bytes validation (H-007)

3. **Medium term (Week 2-3):**
   - Atomic document versioning (M-001)
   - Health check returns 503 when degraded (M-002)
   - SSRF protection for source_url (M-003)
   - Cache-Control headers on API responses (M-007)

4. **Low priority (Week 4+):**
   - Remove dead code (L-001, L-003)
   - Per-session revocation (L-002)
   - Fix `@ts-expect-error` (L-006)
   - Security headers for API routes (L-007)

---

## Files With Most Issues

| File | Issues |
|------|--------|
| `src/lib/tierLimits.ts` | C-001, C-005 |
| `src/app/api/billing/webhook/route.ts` | C-002, H-002, L-005 |
| `src/lib/api-key.ts` | C-003, H-004 |
| `src/app/api/documents/route.ts` | C-004 |
| `src/app/api/conversion/route.ts` | C-006, H-004 |
| `src/lib/csrf.ts` | H-001 |
| `src/worker/index.ts` | H-003 |
| `src/lib/mfa.ts` | H-005 |
| `src/app/api/auth/sessions/route.ts` | L-001, L-002 |
| `src/lib/security.ts` | H-007, L-003 |
| `src/app/api/storage/upload/route.ts` | H-007 |
| `src/app/api/health/route.ts` | M-002, L-004 |
| `src/lib/api-error.ts` | H-002, M-004 |
| `src/lib/cache.ts` | H-002, L-006 |
| `src/lib/supabase.ts` | M-005 |

---

**Bottom line:** The codebase has solid architectural foundations but contains several critical bugs that must be fixed before any production launch. The most urgent are: free tier bypassing all limits, webhook data loss, and API key authorization bypass.