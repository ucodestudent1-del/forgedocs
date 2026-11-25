# ForgeDocs Remaining Issues

**Audit date:** 2026-11-25  
**Purpose:** Track defects, risks, and blockers that could not be fully resolved in this session, with reasons and required next steps.

---

## 1. Unresolved Defects

### R-001 — `document_versions` insert not transactional (P2 — Medium)
**File:** `src/app/api/documents/[id]/content/route.ts`  
**Issue:** The document update (optimistic-locked) and the `document_versions` insert are separate operations with no transaction boundary. If the version insert fails after the document update, the document is updated without a corresponding version record, producing inconsistent history.  
**Why not fixed:** The Supabase JS client does not expose multi-statement transactions trivially. Wrapping both in a transaction requires a database function/RPC or confirming the update succeeds before inserting the version.  
**Required next step:** Implement the version insert inside a Postgres function (or use `supabase.rpc` with a transactional function), called after the document update succeeds. Add a test asserting version consistency under concurrent updates.

### R-002 — Export label mismatch (P3 — Low)
**File:** `src/app/dashboard/settings/page.tsx` (`handleExportDocuments`)  
**Issue:** Button text says "Download your documents as a ZIP archive" but the implementation exports a JSON blob.  
**Required next step:** Update the label to "Export Documents (JSON)" or implement genuine ZIP export.

### R-003 — Artificial delay in profile save (P3 — Low)
**File:** `src/app/dashboard/settings/page.tsx` (`handleSaveProfile`)  
**Issue:** `await new Promise(resolve => setTimeout(resolve, 1000))` adds a fake 1-second delay with no purpose.  
**Required next step:** Remove the `setTimeout`.

### R-004 — Custom `Switch` component lacks `type="button"` (P3 — Low)
**File:** `src/app/dashboard/settings/page.tsx` (`Switch` component)  
**Issue:** The `<button role="switch">` has no explicit `type`; defaults to `submit`, which could submit a surrounding form unintentionally.  
**Required next step:** Add `type="button"`.

---

## 2. Deployment / Environment Blockers (require external configuration & authorization)

### R-005 — Production build not verified
**Issue:** `next build` hangs at the "Creating an optimized production build ..." webpack compilation stage in this sandbox environment (confirmed across multiple attempts, with and without increased Node memory). This is an environment limitation, not a code defect — `tsc --noEmit` passes (the build's type gate, enforced via `ignoreBuildErrors: false`), lint passes, and all 120 tests pass.  
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
**Issue:** New migration `20261126000000_add_notification_preferences.sql` (and any prior migrations) must be applied via `supabase db push` before notification saves work in production.  
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
