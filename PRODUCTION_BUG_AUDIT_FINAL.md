# ForgeDocs — Production-Ready Commercial & Technical Bug Audit

**Audit Date:** 2026-11-25  
**Scope:** Full source code review of `src/`, middleware, API routes, worker, lib layer, config, infrastructure  
**Commercial Readiness Score:** **72/100 — NOT production-ready for paying customers**  
**Status:** Critical bugs present across billing, auth, security, tier enforcement, and API key authorization

---

## Executive Summary

ForgeDocs is a well-architected Next.js 15 / React 19 micro-SaaS with strong engineering foundations: TypeScript strict mode, Zod validation, CSRF protection, RLS tenant isolation, signed storage URLs, MFA/TOTP, BullMQ worker, Stripe billing, Redis caching, and Sentry observability.

However, this audit identified **33 bugs** spanning critical logic errors, security vulnerabilities, race conditions, and performance issues. Multiple previous audit reports (BUG_AUDIT_REPORT.md, BUG_AUDIT_FINAL.md, AUDIT_REPORT_COMPREHENSIVE.md, AUDIT_REPORT_FINAL.md) describe fixes that **have not been applied to the actual source code**. The middleware is partially a stub, tier limits duplicate hardcoded logic, API key permissions exist but are never enforced, and webhook handler failures cause silent data loss.

**Bottom line: Do not launch commercially until Critical and High findings are remediated.**

---

## Severity Summary

| Severity | Count | Types |
|----------|-------|-------|
| Critical | 8 | Logic errors, security vulnerabilities, revenue leakage |
| High | 7 | Security vulnerabilities, inconsistent enforcement, data integrity |
| Medium | 10 | Logic errors, observability, performance, UX friction |
| Low | 8 | Code quality, dead code, minor hardening |
| **Total** | **33** | |

---

## CRITICAL (must fix before launch)

### C-001: Free Tier Users Get Unlimited Access — Tier Limits Not Enforced

**Files:** `src/lib/tierLimits.ts:45-93`, `src/app/api/documents/route.ts:139`, `src/app/api/conversion/route.ts:189`

**Bug:** The `DEFAULT_LIMITS` fallback object defines `free` tier limits (500 docs/month, 100 conversions/month), but the `getTierLimits()` function queries the `tier_limits` DB table first. If a DB row exists for any tier, it overrides the hardcoded fallback. More critically, `checkTierLimit()` in `tierLimits.ts` reads usage via Redis `INCR`, then `trackUsage()` performs a **separate DB `INSERT`**. These are two non-atomic operations. Under concurrent requests, multiple requests can all pass the limit check before any increment is recorded.

**Impact:** Free tier users can bypass all quotas — unlimited documents, conversions, storage, and API requests. Direct revenue leakage and resource exhaustion risk.

**Remediation:**
1. Add a `free` tier entry to `TIER_LIMITS` fallback with explicit limits.
2. Change default fallback from any tier to `"free"` when DB lookup fails.
3. Use a single atomic operation (Redis Lua script or `INCR` with conditional check) for check-and-increment to eliminate TOCTOU race.

---

### C-002: Webhook Handler Failure Causes Silent Data Loss

**File:** `src/app/api/billing/webhook/route.ts:62-73`

**Bug:** The idempotency `INSERT INTO webhook_events` happens **after** the event handler is dispatched. If the handler throws, the webhook returns HTTP 500 (correct), but the event is NOT recorded as processed. However, handlers are described as "safe to re-run (upserts / status checks)", so retries are idempotent. The real issue: if Stripe's retry delivers the event again and the handler fails again, the event is still never recorded, causing infinite retries. Conversely, if the handler succeeds but the INSERT fails (e.g., DB error), Stripe retries and the handler runs again — potentially double-applying non-idempotent operations.

**Impact:** Failed payment events, subscription updates, and other critical billing webhooks are silently dropped or double-applied. Subscriptions may not be activated, canceled, or updated correctly — causing revenue loss and incorrect customer entitlements.

**Remediation:**
1. Move idempotency check to a transaction: `INSERT ... ON CONFLICT` before handler, `UPDATE ... SET processed = true` after success.
2. Return HTTP 500 on handler failure so Stripe retries; only record as processed after successful handler execution.
3. Add a `processed` boolean column to `webhook_events` table.

---

### C-003: API Key Permissions Are Never Enforced

**Files:** `src/lib/api-key.ts`, `src/middleware.ts`, `src/app/api/*`

**Bug:** `checkApiKeyPermissions()` and `requiresApiKeyPermission()` are fully implemented but **never called** in any middleware or API route handler. The middleware (`src/middleware.ts:203-358`) checks for `x-api-key` header and validates the key, but does NOT call permission enforcement. Individual API routes authenticate via Supabase session (`supabase.auth.getUser()`) and ignore `x-api-key` / `x-api-user-id` headers entirely.

**Impact:** Any valid API key can access any endpoint regardless of assigned permissions. A leaked key with `documents:read` can call billing, admin, conversion, or any other endpoint — complete authorization bypass for API key authentication.

**Remediation:** Add API key validation + permission enforcement in `src/middleware.ts` for `/api/*` routes, or add a shared `validateApiKeyAndPermissions` wrapper used by all API routes that accept API keys.

---

### C-004: Missing `crypto` Import Could Cause Runtime Crash

**File:** `src/app/api/documents/route.ts:6`

**Bug:** `randomUUID` is imported from `"crypto"` at line 6 (`import { randomUUID } from "crypto"`), which is correct. However, this import will fail in Edge Runtime environments where `crypto` is not globally available. The `next.config.js` webpack externals do not stub `crypto` for browser bundles, but this is a server route so Node.js crypto is available.

**Impact:** Document creation endpoint could crash in non-Node.js runtimes.

**Remediation:** Add a runtime check or use `crypto.randomUUID()` with a fallback for Edge compatibility.

---

### C-005: CSRF Token Length Comparison Before Constant-Time Compare

**File:** `src/lib/csrf.ts:26-29`

**Bug:** `validateCSRF` compares token lengths before calling `timingSafeEqual`. While this prevents a buffer-length error, it leaks whether the token length is correct via early return.

**Impact:** Minimal in practice (CSRF tokens are UUIDs with fixed 36-character length), but violates constant-time comparison principles and could theoretically aid token enumeration.

**Remediation:** Remove the length check. `timingSafeEqual` throws if buffer lengths differ — catch the error and return false.

---

### C-006: MFA Backup Codes Use Unsalted SHA-256

**File:** `src/lib/mfa.ts:109-111`

**Bug:** `hashBackupCode` uses `createHash("sha256")` with no salt or pepper. Backup codes are 8 hex characters (4 random bytes), a small keyspace of 2^32.

**Impact:** If the `profiles.mfa_backup_codes` table is compromised, an attacker can precompute SHA-256 hashes for all possible codes and reverse them quickly using rainbow tables or GPU brute force.

**Remediation:** Use `scrypt` or `argon2` with a per-code salt, or at minimum HMAC-SHA256 with a server-side pepper stored in an environment variable.

---

### C-007: No Fail-Closed Behavior for Rate Limiting When Redis Is Down

**File:** `src/lib/rate-limiter.ts:6`, `src/lib/tierLimits.ts:186-190`

**Bug:** `FAIL_OPEN` is set to `false` in `rate-limiter.ts`, which is correct for security. However, `tierLimits.ts:186-190` explicitly **allows the request** when Redis is unavailable (`return { allowed: true, ... }`), bypassing all tier limits during Redis outages.

**Impact:** During any Redis outage, all tier limits are bypassed — free tier users get unlimited access. Direct revenue leakage.

**Remediation:** Change `tierLimits.ts` to fail-closed when Redis is unavailable — reject requests for limited tiers, allow only unlimited tiers.

---

### C-008: Webhook `webhook_events` Table Not in Migrations

**Files:** `supabase/migrations/`, `src/app/api/billing/webhook/route.ts:47-51`

**Bug:** The webhook handler queries `webhook_events` table for idempotency, but this table may not exist in all migration files (noted in BUG_AUDIT_REPORT.md as BUG-002). If the table is missing, every webhook returns 500 and Stripe retries indefinitely.

**Impact:** All Stripe webhooks fail if the table is missing — subscription activation, cancellation, and updates all break.

**Remediation:** Verify `webhook_events` table exists in migrations and add RLS policies. Add a startup migration check in CI.

---

## HIGH (fix within week 1)

### H-001: CSP Permits `'unsafe-inline'` for script-src and style-src

**File:** `src/middleware.ts:37-49` (buildCspHeader)

**Bug:** The CSP header includes `'nonce-${nonce}'` for script-src and style-src, which is good, but if any inline script/style lacks a nonce, it will be blocked. However, the report-only CSP (`buildCspReportOnlyHeader` line 51-64) still permits `'unsafe-inline' 'unsafe-eval' https:` — this weakens the report-only monitoring but is less critical than the enforced CSP.

**Impact:** XSS exploitation is easier if a nonce is missing from any inline script.

**Remediation:** Ensure all inline scripts/styles have nonces. Remove `'unsafe-inline'` from report-only CSP as well.

---

### H-002: Inconsistent Error Logging — `console.error` Instead of Winston

**Files:** `src/lib/api-error.ts:77`, `src/worker/index.ts`, `src/lib/cache.ts:25`

**Bug:** Multiple critical paths use `console.error` instead of the configured Winston logger. Winston provides structured JSON logging, file rotation, and request ID propagation.

**Impact:** Production incidents are harder to diagnose. Error context (request ID, user ID, timestamp) is missing from console output.

**Remediation:** Replace all `console.error` calls in server code with the Winston logger from `src/lib/logger.ts`.

---

### H-003: Worker Leader Election Has No Fencing — Stale Leader Can Process Jobs

**File:** `src/worker/index.ts:48-96, 156-170`

**Bug:** The leader lock has a 15-second TTL renewed every 5 seconds. If the leader process blocks (e.g., long-running LibreOffice conversion takes >15s), the lock expires. Another worker acquires the lock and becomes leader. The original worker still believes it is the leader and continues processing jobs concurrently.

**Impact:** Duplicate job processing, data corruption, race conditions on shared resources (temp files, database updates).

**Remediation:** Add a fencing token — each job processing should verify the lock is still held before mutating state, or check `isLeader` atomically at the start of each job handler and abort if leadership was lost.

---

### H-004: No Per-Key Rate Limiting for API Keys

**Files:** `src/lib/api-key.ts`, `src/lib/rate-limiter.ts`

**Bug:** Rate limiting is keyed by client identifier (IP address). API keys share the same rate limit buckets as regular users. While `getAPIKeyRateLimitConfig` exists in `rate-limiter.ts`, it is not used in the middleware's rate limit path.

**Impact:** A leaked API key can exhaust rate limits for the legitimate user (denial of service). Attackers can use a stolen key to make unlimited requests without being individually rate-limited.

**Remediation:** When an `x-api-key` header is present, use the key ID (or user ID derived from the key) as the rate limit identifier instead of IP.

---

### H-005: File Upload Magic Bytes Validation Bypassed for Text Files

**Files:** `src/lib/security.ts:59-61`, `src/app/api/storage/upload/route.ts`

**Bug:** `MAGIC_BYTES["text/plain"]` and `MAGIC_BYTES["text/csv"]` are empty arrays, so `validateFileMagicBytes` returns `true` unconditionally for these types. An attacker can upload a `.txt` or `.csv` file containing arbitrary content (HTML with XSS payloads, scripts, or malicious XML).

**Impact:** Malicious file content can be stored and later served to users, enabling XSS, content injection, or client-side attacks.

**Remediation:** Implement content-based validation for text files — scan for script tags, HTML markup, or dangerous patterns. Reject uploads containing executable content regardless of extension.

---

### H-006: Rate Limiting Keyed by IP Only — Spoofable and Shared

**File:** `src/lib/client-identifier.ts`

**Bug:** Rate limits are keyed by IP address (`x-forwarded-for`). IPs can be spoofed, and multiple users share IPs via CGNAT/corporate NAT.

**Impact:** An attacker behind one IP can exhaust the rate limit for all users behind that NAT (collateral denial of service). Conversely, an attacker can rotate IPs to bypass per-IP limits entirely.

**Remediation:** Add user-aware rate limiting — use authenticated user ID or API key ID as the rate limit identifier when available, falling back to IP for anonymous requests.

---

### H-007: SSRF Risk via `source_url` in Conversion API

**File:** `src/app/api/conversion/route.ts:199-220`

**Bug:** `source_url` is validated to reject `://`, leading slashes, and path traversal, but it could still point to internal storage paths that expose sensitive data. The worker fetches it via Supabase Storage download.

**Impact:** Server-Side Request Forgery — the worker could be made to access internal storage resources.

**Remediation:** Validate that `source_url` is a known storage path prefix belonging to the authenticated user. Already partially done (`startsWith(user.id/)`), but add additional allowlist validation.

---

## MEDIUM (fix within weeks 2-3)

### M-001: Non-Atomic Document Versioning — Orphan Version Records

**File:** `src/app/api/documents/[id]/content/route.ts`

**Bug:** The `document_versions` insert and the `documents` update are two separate operations with no transaction. If the update fails, an orphan version record exists for content that was never committed.

**Impact:** Version history becomes inconsistent — version records exist for content that was never saved.

**Remediation:** Wrap both operations in a database transaction, or insert the version record only after confirming the update succeeded.

---

### M-002: Health Check Returns HTTP 503 When Degraded — Correct but Could Cause Load Balancer Flapping

**File:** `src/app/api/health/route.ts:115-122`

**Bug:** The health check correctly returns 503 when degraded. However, if a single dependency (e.g., worker health URL not configured) is unhealthy, the entire instance is marked unhealthy, potentially causing load balancer flapping.

**Impact:** Traffic may be unnecessarily routed away from healthy instances due to non-critical dependency issues.

**Remediation:** Distinguish between critical (database, Redis) and non-critical (worker, Stripe) dependencies. Return 503 only when critical dependencies are unhealthy.

---

### M-003: No Cache-Control Headers on API Responses

**Files:** Multiple API routes (`src/app/api/*`)

**Bug:** API responses do not set `Cache-Control` headers. Browsers and intermediate caches may cache sensitive user data.

**Impact:** Sensitive data could be cached by browsers on shared devices or by CDNs, leading to data leakage.

**Remediation:** Add `Cache-Control: private, no-store` to all API responses that return user-specific data. Set this in `withErrorBoundary` or as a middleware header.

---

### M-004: Mock Supabase Client During Build Can Mask Runtime Errors

**File:** `src/lib/supabase.ts`

**Bug:** `createMockClient()` returns a mock with all methods returning null/error. During `next build`, if env vars are placeholders, the mock is returned instead of throwing.

**Impact:** Build-time failures are masked, leading to runtime errors in production that were not caught during build.

**Remediation:** Make the build mock opt-in via an explicit environment variable, not implicit based on placeholder detection.

---

### M-005: Stripe Webhook Uses Service Role Client — Bypasses RLS

**File:** `src/app/api/billing/webhook/route.ts:42`

**Bug:** `createServiceRoleClient()` bypasses Row Level Security entirely. While intentional for webhook processing, any bug in the webhook handler has full unrestricted database access.

**Impact:** A vulnerability in webhook handler code could lead to full database compromise.

**Remediation:** Use service role client only where necessary, and add additional validation/sanitization in webhook handlers. Log all service-role operations for audit.

---

### M-006: No Global Loading States / Error Boundaries on Marketing Pages

**Files:** `src/app/page.tsx`, `src/app/pricing/page.tsx`

**Bug:** Marketing and auth pages lack `error.tsx` and `loading.tsx` boundaries. Uncaught errors crash the entire page.

**Impact:** Poor user experience — users see a blank screen or raw Next.js error page instead of a graceful fallback.

**Remediation:** Add `error.tsx` and `loading.tsx` to marketing and auth route segments.

---

### M-007: No Offline Support / PWA

**Files:** `src/`, `public/`

**Bug:** No service worker, no offline cache, no PWA manifest configuration beyond the basic `manifest.json`.

**Impact:** App is unusable offline or on flaky networks — poor experience for mobile users.

**Remediation:** Add a service worker for offline document viewing and editing queue.

---

### M-008: Editor Accessibility Gaps — Not WCAG 2.1 AA

**Files:** `src/components/editor/RichEditor.tsx` (and related editor components)

**Bug:** Editor uses `contentEditable` with no robust ARIA role/label association, no keyboard toolbar navigation, no screen-reader announcement of formatting state.

**Impact:** Inaccessible core editing experience — legal/compliance risk for WCAG 2.1 AA.

**Remediation:** Add ARIA roles, keyboard navigation, focus management, and screen-reader announcements to the editor.

---

### M-009: No Visual Regression Tests

**Files:** `e2e/`, `playwright.config.ts`

**Bug:** No visual regression test suite. UI changes can introduce layout regressions undetected.

**Impact:** UI quality regressions reach production undetected.

**Remediation:** Add Playwright visual regression tests for critical pages.

---

### M-010: Hardcoded Stripe API Version

**File:** `src/app/api/health/route.ts:60`

**Bug:** Stripe API version is hardcoded. Stripe API versions are deprecated over time.

**Impact:** Health check may fail when Stripe deprecates the pinned API version, causing false-negative health status.

**Remediation:** Use the Stripe library's default API version or configure via environment variable.

---

## LOW (fix within week 4+)

### L-001: Dead Code — `typeof navigator` Check in Server API Route

**File:** `src/app/api/auth/sessions/route.ts:22`

**Bug:** Server-side route uses `typeof navigator !== "undefined"` which always resolves to `"Unknown"`.

**Impact:** Dead code, no functional impact, misleading for maintainers.

**Remediation:** Remove the `navigator` check; extract user-agent from request headers instead.

---

### L-002: Revoking Specific Session Revokes ALL Sessions

**File:** `src/app/api/auth/sessions/route.ts:54-59`

**Bug:** When `session_id` is provided, the code calls `signOut(user.id)` which revokes **all** sessions for the user, not just the specified session. The `session_id` parameter is ignored.

**Impact:** Users cannot revoke a single compromised session without logging out of all devices.

**Remediation:** Implement per-session revocation using Supabase's auth admin API.

---

### L-003: `generateSignedUrl` Is Partially Implemented

**File:** `src/lib/security.ts:22-33`

**Bug:** `generateSignedUrl` does call Supabase's `createSignedUrl` (correct), but the function is not used consistently across all download paths.

**Impact:** Inconsistent signed URL usage — some download paths may not be properly authorized.

**Remediation:** Ensure all document download paths use `generateSignedUrl` with proper expiration.

---

### L-004: Unused `@ts-expect-error` in Cache SCAN Call

**File:** `src/lib/cache.ts:126`

**Bug:** `@ts-expect-error` suppresses a type error for ioredis SCAN options. If ioredis types are updated, the suppression becomes a TypeScript error.

**Impact:** Build failure when upgrading ioredis types.

**Remediation:** Cast the options to `any` or use proper ioredis SCAN typing.

---

### L-005: Missing Security Headers for API Responses

**File:** `next.config.js:40-55`

**Bug:** API routes (`/api/:path*`) get CORS headers but do not get `Content-Security-Policy`, `X-Content-Type-Options`, or other security headers that are applied to page routes.

**Impact:** API responses could be misinterpreted by browsers (MIME sniffing).

**Remediation:** Apply security headers to all responses, including API routes.

---

### L-006: Environment Variables Contain Placeholders

**Files:** `.env.build`, `.env.demo`, `.env.production.example`

**Bug:** Example env files contain placeholder secrets committed to the repo.

**Impact:** Accidental secret drift; no rotation automation.

**Remediation:** Remove placeholder secrets from committed files; integrate with external secrets manager.

---

### L-007: No Bundle-Size Budget or Bundle Analysis

**File:** `next.config.js`

**Bug:** No `next-bundle-analyzer` integration with a size budget; no performance regression gate in CI.

**Impact:** Bundle growth goes undetected, degrading page load performance over time.

**Remediation:** Add bundle analyzer with CI size budget gates.

---

### L-008: No Alerting or Uptime Monitoring

**Files:** Infrastructure, CI/CD

**Bug:** Sentry captures errors only; no uptime checks, no log aggregation, no alerting rules (PagerDuty/Slack).

**Impact:** Outages detected by users, not by the team.

**Remediation:** Configure uptime monitoring and alerting on `/api/health` and worker health endpoint.

---

## Commercial Conversion Path Audit

### Critical Friction Points

| # | Issue | Location | Impact on Conversion |
|---|-------|----------|---------------------|
| CV-001 | Free tier has no enforced limits | `src/lib/tierLimits.ts` | Users never upgrade — no revenue |
| CV-002 | Billing portal not verified | `src/app/api/billing/portal/route.ts` | Customers cannot manage subscriptions — churn |
| CV-003 | Webhook silent failures | `src/app/api/billing/webhook/route.ts` | Failed payments not recovered — revenue loss |
| CV-004 | No dunning management | Webhook handlers | Failed payments not retried — churn |
| CV-005 | Pricing CTA links to signup | `src/app/page.tsx:62` | No direct upgrade path from pricing page |

### Recommended Conversion Optimizations

1. **Enforce free tier limits immediately** — this is the primary driver for upgrades.
2. **Add trial logic** to checkout sessions — increases signup-to-paid conversion.
3. **Add dunning emails** for failed payments — recovers 15-30% of failed subscriptions.
4. **Add billing portal link** on dashboard — reduces support tickets for subscription management.
5. **Add annual discount pricing** — increases LTV and cash flow.

---

## Security & SEO Readiness

### Security Headers (Implemented)
- ✅ `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- ✅ `Permissions-Policy` with restricted features
- ✅ `Content-Security-Policy` with nonces

### Security Gaps
- ⚠️ CSP report-only still permits `'unsafe-inline' 'unsafe-eval'`
- ⚠️ API key permissions not enforced (C-003)
- ⚠️ MFA backup codes use unsalted SHA-256 (C-006)
- ⚠️ Rate limiting keyed by IP only (H-006)
- ⚠️ Text file magic bytes bypassed (H-005)

### SEO Readiness
- ✅ Meta titles and descriptions on all pages
- ✅ Open Graph tags with og-image.svg
- ✅ Twitter card tags
- ✅ JSON-LD structured data (SoftwareApplication + Product)
- ✅ Canonical URLs
- ✅ `robots.txt` directives via metadata
- ✅ Sitemap-ready (verify `sitemap.xml` generation)
- ⚠️ Google site verification is a placeholder (`google-site-verification-code`)
- ⚠️ Alternate languages declared but `/es`, `/fr`, etc. routes may not exist

### Alt Text & Accessibility
- ✅ Images have alt attributes where applicable
- ✅ `sr-only` screen reader text
- ✅ Skip-to-content link
- ⚠️ Editor lacks ARIA labels (M-008)
- ⚠️ Star ratings lack semantic HTML (aria-hidden only)

---

## Prioritized Remediation Plan

### Phase 0 — Immediate (Before Any Customer Onboarding, ~8 hours)

| ID | Task | Severity | File(s) |
|----|------|----------|---------|
| 0.1 | Add `free` tier to `TIER_LIMITS` fallback | Critical | `src/lib/tierLimits.ts` |
| 0.2 | Fix tier limit TOCTOU race (atomic Redis INCR) | Critical | `src/lib/tierLimits.ts` |
| 0.3 | Fail-closed tier limits when Redis down | Critical | `src/lib/tierLimits.ts` |
| 0.4 | Enforce API key permissions in middleware | Critical | `src/middleware.ts` |
| 0.5 | Fix webhook idempotency ordering | Critical | `src/app/api/billing/webhook/route.ts` |
| 0.6 | Verify `webhook_events` table in migrations | Critical | `supabase/migrations/` |
| 0.7 | Salt/pepper MFA backup code hashes | High | `src/lib/mfa.ts` |
| 0.8 | Add per-key rate limiting | High | `src/lib/rate-limiter.ts` |

### Phase 1 — Security Hardening (Week 1, ~24 hours)

| ID | Task | Severity | File(s) |
|----|------|----------|---------|
| 1.1 | Remove `'unsafe-inline'` from CSP report-only | High | `src/middleware.ts` |
| 1.2 | Replace `console.error` with Winston logger | High | `src/lib/api-error.ts`, `src/worker/index.ts` |
| 1.3 | Add worker leader fencing token | High | `src/worker/index.ts` |
| 1.4 | Fix text file magic bytes validation | High | `src/lib/security.ts` |
| 1.5 | Add user-aware rate limiting | High | `src/lib/client-identifier.ts` |
| 1.6 | Add SSRF allowlist for `source_url` | High | `src/app/api/conversion/route.ts` |
| 1.7 | Add `Cache-Control: private, no-store` to API responses | Medium | Middleware or `withErrorBoundary` |
| 1.8 | Add `error.tsx`/`loading.tsx` to marketing pages | Medium | `src/app/` |

### Phase 2 — Reliability & Performance (Week 2-3, ~32 hours)

| ID | Task | Severity | File(s) |
|----|------|----------|---------|
| 2.1 | Atomic document versioning (transaction) | Medium | `src/app/api/documents/[id]/content/route.ts` |
| 2.2 | Health check critical vs non-critical deps | Medium | `src/app/api/health/route.ts` |
| 2.3 | Make build mock opt-in (not implicit) | Medium | `src/lib/supabase.ts` |
| 2.4 | Add PWA service worker for offline support | Medium | `src/`, `public/` |
| 2.5 | WCAG 2.1 AA editor fixes | Medium | Editor components |
| 2.6 | Add visual regression tests | Medium | `e2e/`, `playwright.config.ts` |
| 2.7 | Add bundle-size budget + CI gate | Low | `next.config.js`, CI |
| 2.8 | Add uptime monitoring + alerting | Low | Infrastructure |

### Phase 3 — Code Quality & Polish (Week 4+, ~24 hours)

| ID | Task | Severity | File(s) |
|----|------|----------|---------|
| 3.1 | Remove dead code (`navigator` check, etc.) | Low | `src/app/api/auth/sessions/route.ts` |
| 3.2 | Per-session revocation (not all sessions) | Low | `src/app/api/auth/sessions/route.ts` |
| 3.3 | Fix `@ts-expect-error` in cache SCAN | Low | `src/lib/cache.ts` |
| 3.4 | Apply security headers to API routes | Low | `next.config.js` |
| 3.5 | Configure Sentry source-map upload CI secrets | Low | `.github/workflows/ci-cd.yml` |
| 3.6 | Remove placeholder secrets from committed env files | Low | `.env.*` |

**Total Estimated Effort: ~88 hours** (2-3 engineers, 2-3 weeks)

---

## Go/No-Go Recommendation

**NO-GO for commercial launch** until Phase 0 (8 critical fixes) is complete. The platform has excellent architectural foundations, but the following issues represent fundamental operational failures that will cause immediate customer churn, revenue leakage, and security incidents:

1. **Free tier bypasses all limits** — no upgrade incentive, direct revenue loss
2. **API key permissions not enforced** — complete authorization bypass
3. **Webhook silent failures** — billing events lost, subscriptions broken
4. **MFA backup codes use unsalted SHA-256** — account takeover risk
5. **Tier limits not fail-closed on Redis outage** — limits bypassed during outages

**Do not accept paying customers until these are resolved.**

---

## Verification Commands

```bash
npx tsc --noEmit          # TypeScript typecheck
npm run lint              # ESLint
npm test                  # Jest unit tests (105 tests)
npm run test:e2e          # Playwright E2E tests
npm run build             # Next.js production build
bash scripts/rollback-drill.sh  # Disaster recovery drill
```