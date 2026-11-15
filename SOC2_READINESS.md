# ForgeDocs — SOC2 Type II Readiness Documentation

## Scope

System: ForgeDocs document management platform (Next.js 15, React 19, Supabase PostgreSQL, Redis, Stripe, Resend)

Trust Services Criteria addressed:
- **Security** (CC6.x, CC7.x) — logical access, network security
- **Availability** (A1.x) — system uptime, monitoring
- **Confidentiality** (C1.x) — data protection, encryption

## Control Environment (CC1.x)

| Criterion | Implementation | Evidence |
|-----------|---------------|----------|
| CC1.1 — Commitment to integrity | Engineering handbook, code review policy, this document | `ARCHITECTURE.md`, `AGENTS.md`, PR review workflow |
| CC1.2 — Board oversight | CTO-led security reviews, quarterly audits | Meeting minutes, audit trail |
| CC1.3 — Organizational structure | Role-based access (user/admin/owner), least-privilege RLS | `supabase/migrations/001_initial_schema.sql` |
| CC1.4 — Competency | Onboarding security training, engineering skill matrix | HR records, training logs |
| CC1.5 — Accountability | Job descriptions, security responsibilities in contracts | Employment agreements |

## Logical Access (CC6.x)

| Criterion | Implementation | Evidence |
|-----------|---------------|----------|
| CC6.1 — User access provisioning | Supabase Auth signup + email verification, profile-based roles | `src/app/api/auth/signup/route.ts`, RLS policies |
| CC6.2 — Access termination | Session revocation, account deletion, API key revocation | `src/app/api/auth/sessions/route.ts`, `src/app/api/auth/api-keys/[id]/route.ts` |
| CC6.3 — Authentication | Password policy (8+ chars, complexity), account lockout (5 attempts/15min), MFA/TOTP | `src/lib/password.ts`, `src/lib/auth.ts`, `src/lib/mfa.ts` |
| CC6.4 — Multi-factor authentication | TOTP via `otplib`, enforceable per-user and for admins | `src/lib/mfa.ts`, `src/middleware.ts` |
| CC6.5 — Password reset | Secure reset flow with time-limited tokens | `src/app/api/auth/forgot-password/route.ts` |
| CC6.6 — API key access | SHA-256 hashed keys, prefix-based lookup, revocation, last-used tracking | `src/lib/api-key.ts`, `src/app/api/auth/api-keys/route.ts` |

## Network Security (CC7.x)

| Criterion | Implementation | Evidence |
|-----------|---------------|----------|
| CC7.1 — Network segmentation | Supabase managed VPC, app tier separated from DB tier | `docker-compose.yml`, Railway platform |
| CC7.2 — External threat protection | CSP headers, rate limiting, CORS origin validation | `next.config.js`, `src/lib/rate-limiter.ts` |
| CC7.3 — Transmission encryption | TLS 1.2+ enforced, secure cookies, HSTS | `next.config.js`, cookie attributes |
| CC7.4 — Malicious code prevention | DOMPurify sanitization, dependency scanning (npm audit, Snyk) | `src/lib/sanitize.ts`, `.github/workflows/ci-cd.yml` |

## Change Management (CC8.x)

| Criterion | Implementation | Evidence |
|-----------|---------------|----------|
| CC8.1 — Change authorization | Pull request review required, protected `main` branch | GitHub branch protection, `.github/workflows/ci-cd.yml` |
| CC8.2 — Change design | Architecture docs, migration up/down pairs | `ARCHITECTURE.md`, `supabase/migrations/*.sql` |
| CC8.3 — Change testing | CI lint + typecheck + tests, migration validation | CI pipeline, migration validation job |
| CC8.4 — Change approval | Code owner review, admin approval for schema changes | PR review, migration review |

## System Operations (CC7.x / CC8.x)

| Criterion | Implementation | Evidence |
|-----------|---------------|----------|
| CC7.2 — Capacity planning | k6 load tests, Redis pooling, BullMQ concurrency config | `k6/load-test.js`, `src/lib/cache.ts` |
| CC7.3 — Incident response | Error logging (Winston + Sentry), health checks, graceful shutdown | `src/lib/logger.ts`, `sentry.*`, `src/worker/index.js` |
| CC8.5 — Backup and recovery | Disaster recovery plan, migration rollback support | `DISASTER_RECOVERY.md`, migration `down` sections |

## Risk Assessment (CC9.x)

| Criterion | Implementation | Evidence |
|-----------|---------------|----------|
| CC9.1 — Risk identification | Security audit reports, bug bounty program | `AUDIT_REPORT_FINAL.md`, `BUG_AUDIT_REPORT.md` |
| CC9.2 — Risk evaluation | Severity classification (critical/high/medium/low) | Audit report severity matrix |
| CC9.3 — Risk response | Remediation roadmap, phased fixes | Prioritized roadmap in audit report |

## Monitoring (CC7.x)

| Criterion | Implementation | Evidence |
|-----------|---------------|----------|
| CC7.1 — Security monitoring | Sentry error tracking, audit log writes, request ID tracing | `sentry.client.config.ts`, `src/lib/audit.ts` |
| CC7.2 — Anomaly detection | Rate limiting, account lockout, failed login tracking | `src/lib/rate-limiter.ts`, `src/lib/auth.ts` |
| CC7.3 — Incident escalation | Critical severity audit logs, on-call rotation | `src/lib/audit.ts` |

## Evidence List (Auditor-Ready)

1. `supabase/migrations/*.sql` — RLS policies, table schemas, migration versioning
2. `src/lib/password.ts` — Password complexity requirements
3. `src/lib/auth.ts` — Account lockout implementation
4. `src/lib/mfa.ts` — TOTP MFA implementation
5. `src/lib/api-key.ts` — API key hashing, validation, revocation
6. `src/lib/audit.ts` — Audit event logging (Winston + database)
7. `src/middleware.ts` — MFA enforcement, email verification enforcement, protected routes
8. `next.config.js` — CSP headers, CORS configuration
9. `src/lib/rate-limiter.ts` — Redis-backed rate limiting
10. `SECRETS_MANAGEMENT.md` — Secret rotation procedures
11. `.github/workflows/ci-cd.yml` — CI lint, typecheck, tests, migration validation, security scan
12. `DISASTER_RECOVERY.md` — Disaster recovery procedures
13. `DOCKERFILE` — Non-root user, secrets not baked into image
14. `AUDIT_REPORT_FINAL.md` — Third-party-style self-audit findings and remediation

## Gaps to Close Before SOC2 Audit

| Gap | Remediation | Owner | Target |
|-----|------------|-------|--------|
| Formal security policy documents | Publish security policy, acceptable use policy | CTO | Pre-audit |
| Vendor risk assessment | Document Supabase, Stripe, Resend, Sentry due diligence | Procurement | Pre-audit |
| Formal incident response plan | Documented IR playbook with escalation contacts | Engineering | Pre-audit |
| Access review cadence | Quarterly user access recertification | Engineering Manager | Post-audit (Type II) |
| Penetration test report | Third-party pen test (OWASP Top 10) | External firm | Pre-audit |
| Background check policy | Pre-employment screening documentation | HR | Pre-audit |
