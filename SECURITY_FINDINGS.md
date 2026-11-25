# ForgeDocs Security Findings

**Audit date:** 2026-11-25  
**Scope:** Authentication, authorization, tenant isolation, input validation, cryptography, secrets, headers, webhook integrity, file uploads.

---

## Summary

No confirmed security vulnerabilities (authentication bypass, authorization bypass, or customer data exposure) remain unresolved after this audit.

The application has a strong security foundation: CSRF protection on all mutations with token rotation on login, RLS tenant isolation on all tables, secure cookies (`httpOnly`, `secure`, `sameSite=strict`), fail-closed rate limiting, account lockout after 5 failed attempts, Stripe webhook signature verification with idempotency, API key permission enforcement in middleware, signed storage URLs, and CSP/security headers via middleware and `next.config.js`.

---

## Verified Security Controls

| Control | Status | Evidence |
|---------|--------|----------|
| CSRF protection | Verified | `validateCSRF` on all mutation routes; token rotated on login (`rotateCSRFToken`, new cookie on successful login) |
| Authentication enforcement | Verified | Middleware protects `/dashboard`, `/editor`, `/billing`, `/settings`; API routes check `supabase.auth.getUser()` |
| Authorization / tenant isolation | Verified | RLS enabled on all tables; policies use `auth.uid()` = user_id / account membership; service-role only for webhooks/admin |
| Secure cookies | Verified | `httpOnly`, `secure`, `sameSite=strict` in Supabase client and CSRF/session cookies |
| Rate limiting | Verified | Redis-backed, fail-closed, per-IP and per-API-key, tiered limits, `Retry-After` headers |
| Account lockout | Verified | 5 attempts → 15-minute lockout (fixed: lockout now correctly clears after expiry) |
| Stripe webhook integrity | Verified | Signature verification via `stripe.webhooks.constructEvent`; idempotency via `webhook_events` table; handler failure returns 500 (fixed silent data loss) |
| API key permissions | Verified | Middleware enforces `x-api-key` validation + `checkApiKeyPermissions` for `/api/*` routes; fail-closed for unknown endpoints |
| Signed storage URLs | Verified | `createSignedUrl` with TTL; path ownership checks |
| Security headers | Verified | CSP (nonce-based, `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS |
| Input validation | Verified | Zod schemas on all mutations; file magic-bytes validation on uploads |
| Secret handling | Verified | Secrets loaded at runtime via `src/lib/env.ts` / secrets manager; `.env.production` untracked from git; no secrets in Docker image layers |
| Error logging | Verified | Winston structured logger; errors logged without exposing stack traces to clients |

---

## Fixed Security-Related Defects

| ID | Finding | Severity | File | Fix |
|----|---------|----------|------|-----|
| B-001 | Billing webhook silent data loss (revenue/entitlement risk) | P0 | `src/app/api/billing/webhook/route.ts` | Retry of unprocessed events re-runs handler; 200 only after success; failures return 500 unmarked |
| B-002 | Account lockout never clears (denial of service / lockout) | P0 | `src/lib/auth.ts`, `src/lib/cache.ts` | `checkLoginAttempts` reads stored lockout timestamp correctly; expired lockouts now clear |
| B-003 | TypeScript build errors (type-safety) | P1 | 3 files | `tsc --noEmit` passes; `ignoreBuildErrors: false` enforced |
| B-012 | `.env.production` tracked in git (secret leak risk) | P4 | `.env.production`, `.gitignore` | Untracked `.env.production`; local file preserved |

---

## Remaining Security Risks (Operational — require configuration)

| Risk | Severity | Notes |
|------|----------|-------|
| Production secrets not configured | High | `.env.production` contains placeholders only; real Supabase/Stripe/Resend/Redis/MFA keys must be provided at runtime, never committed |
| Stripe webhook endpoint not configured | High | Must register `https://<prod>/api/billing/webhook` in Stripe dashboard and set `STRIPE_WEBHOOK_SECRET` |
| External penetration test not performed | Medium | OWASP Top 10 / SOC 2 pen test requires third-party security firm |
| File upload text-file magic-bytes bypass | Low | Prior audit H-007: `text/plain`/`text/csv` magic bytes are empty arrays, allowing arbitrary content upload. Low risk (content served as download), documented. |
| E2E/security scan not run against live target | Medium | Trivy container scan, Snyk, and Playwright E2E require CI/infrastructure access |

---

## Not Performed (require external authorization/credentials)

- Penetration test / OWASP Top 10 assessment
- Dynamic authentication testing against live third-party IdP (SAML/Google OAuth)
- Stripe webhook end-to-end in test mode (no real charges)
- Container/dependency vulnerability scans in a live pipeline
