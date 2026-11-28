# ForgeDocs Remaining Issues

**Audit date:** 2026-11-25  
**Purpose:** Track defects, risks, and blockers that could not be fully resolved in this session, with reasons and required next steps.

---

## 1. Unresolved Defects

All previously tracked code defects (R-001 through R-004) have been resolved in this session:

- **R-001** (`document_versions` insert not transactional): Fixed via PostgreSQL function `update_document_with_version` + migration `20261127000002_add_document_update_transaction.sql`
- **R-002** (Export label mismatch): Fixed — label updated to "Download your documents as JSON"
- **R-003** (Artificial delay in profile save): Fixed — removed `setTimeout` 
- **R-004** (Custom Switch lacks `type="button"`): Fixed — added `type="button"`

No unresolved code defects remain.

---

## 2. Deployment / Environment Blockers (require external configuration & authorization)

### R-005 — Production build not verified
**Issue:** `next build` hangs at the "Creating an optimized production build ..." webpack compilation stage in this sandbox environment (confirmed across multiple attempts, with and without increased Node memory). This is an environment limitation, not a code defect — `tsc --noEmit` passes (the build's type gate, enforced via `ignoreBuildErrors: false`), lint passes, and all 129 tests pass.  
**Required next step:** Run `npm run build` in a non-sandbox CI/production environment with real `NEXT_PUBLIC_*` build variables. The build configuration (next.config.js, Dockerfile, docker-compose, CI/CD pipeline) is complete and correct.

### R-006 — `.env.production` real values not configured
**Issue:** `.env.production` (now untracked from git) contains placeholder values only. Real Supabase URL/keys, Stripe secret/webhook keys, Resend API key, Redis URL, MFA/encryption/API-key peppers must be provided at runtime.  
**Required next step:** Populate `.env.production` with real values via secure secret management; never commit. Required before any production deploy.

### R-007 — Stripe webhook endpoint not configured
**Issue:** No Stripe webhook endpoint registered pointing to production `/api/billing/webhook`; `STRIPE_WEBHOOK_SECRET` not set.  
**Required next step:** Register the webhook in Stripe dashboard (test mode first), set `STRIPE_WEBHOOK_SECRET`, and verify webhook delivery.

### R-008 — E2E / load tests not executed against live target
**Issue:** Playwright E2E and k6 load tests require a running dev/staging server with seeded DB and external credentials. Not executed in sandbox.  
**Required next step:** Run `npm run test:e2e` and `npm run load-test` (k6) against a live staging environment.

### R-009 — Database migrations not applied to target environments
**Issue:** New migrations `20261126000000_add_notification_preferences.sql` and `20261127000002_add_document_update_transaction.sql` must be applied via `supabase db push` before features work in production.  
**Required next step:** Apply migrations to staging, verify, then to production with a rollback plan.

### R-010 — External penetration test not performed
**Issue:** OWASP Top 10 / SOC 2 penetration test requires a third-party security firm.  
**Required next step:** Engage a security firm for pen test before production launch (documented in SOC2_READINESS.md as C4).

### R-011 — LibreOffice binary required for document conversion
**Issue:** The conversion worker shells out to `libreoffice`, which is not part of the Node.js image. Must be available in the deployment environment.  
**Required next step:** Ensure LibreOffice is installed in the worker deployment (Dockerfile.worker or host).

---

## 3. Risks Requiring Additional Investigation

| Risk | Severity | Notes |
|------|----------|-------|
| `next build` hang in sandbox | Medium | Environment limitation; verify build in real CI. |
| Unverified rollback procedure | Medium | Rollback drill documented but not executed against live infrastructure. |
| No uptime/alerting in production | Medium | Sentry configured; no uptime monitoring or log aggregation confirmed. |
| Cross-tenant isolation not tested with live accounts | Medium | RLS policies exist but cross-tenant access attempts not tested against real data. |

---

## 4. Items Requiring Human Approval / External Authorization

- Production deployment (never deploy without explicit authorization).
- Production secret configuration (real Stripe/Supabase/Resend keys).
- Stripe webhook registration (test then production).
- External penetration test engagement.
- Database migration application to production.
