# ForgeDocs Production Readiness Roadmap & Checklist

**Version:** 2.0  
**Date:** 2026-11-13  
**Status:** In Progress  
**Platform:** ForgeDocs — Next.js 15 App Router, React 19, Tailwind CSS, Supabase, Redis, Stripe, Resend, Railway

---

## Executive Summary

ForgeDocs is functionally complete with strong security fundamentals (CSRF, rate limiting, RLS, secure cookies) and all critical bugs resolved. However, it is **not yet commercially viable**. To transition to a production-ready state capable of accepting paying customers, work remains in six key areas:

1. **Performance Optimization** — Caching, asset optimization, CDN
2. **Security Hardening** — SSL/TLS, OWASP Top 10, auth, encryption
3. **Scalability & Infrastructure** — Hosting, load balancing, DB optimization
4. **Reliability & Monitoring** — Error logging, uptime, backups, CI/CD
5. **SEO & Accessibility** — Metadata, semantic HTML, WCAG compliance
6. **Analytics & Compliance** — Tracking, GDPR/CCPA, cookie consent

This document provides a comprehensive checklist, technical requirements, and phased implementation roadmap.

---

## Area 1: Performance Optimization

### Goal
Sub-2s First Contentful Paint (FCP), sub-500ms API p95 response times, <1% error rate under 100 concurrent users.

### Checklist

#### Asset Optimization
- [ ] Configure Next.js `<Image />` with `sizes` and `quality` props on all product images
- [ ] Enable Next.js automatic image optimization (Sharp/Squoosh) — install `sharp` dependency
- [ ] Serve images in WebP/AVIF formats with fallbacks
- [ ] Lazy-load below-the-fold images (`loading="lazy"`)
- [ ] Preload critical above-the-fold images (`<link rel="preload">`)
- [ ] Bundle analyzer: run `next-bundle-analyzer` to identify large dependencies
- [ ] Tree-shake unused UI components (shadcn/ui — import only used components)
- [ ] Dynamic imports with `next/dynamic` for heavy client components (editor, charts)
- [ ] Minify CSS/JS — verify production build minification is active
- [ ] Enable gzip/brotli compression at the CDN/edge layer
- [ ] Set long `Cache-Control` headers on static assets (1 year, immutable)

#### Caching Mechanisms
- [ ] Next.js Route Segment Config: export `dynamic = "force-static"` or `revalidate` for public pages
- [ ] ISR (Incremental Static Regeneration) on marketing pages (`/pricing`, `/features`, `/solutions`)
- [ ] Redis caching for document listings and user profiles (5-min TTL, already partially implemented)
- [ ] Browser cache headers for API responses where appropriate (`Cache-Control: public, max-age=60`)
- [ ] Edge caching via CDN for static assets and public HTML
- [ ] Stale-while-revalidate pattern for document data
- [ ] CDN cache invalidation on document updates (webhook-based)

#### Database Optimization
- [ ] Index all foreign keys and query-filtered columns (`user_id`, `status`, `created_at`)
- [ ] Full-text search index (already added via `search_vector` tsvector + GIN)
- [ ] Connection pooling via Supabase (PgBouncer) — verify production mode uses pooled connection
- [ ] Read replicas for read-heavy workloads (document listing, search)
- [ ] Query analysis: enable `pg_stat_statements`, review slow queries monthly
- [ ] VACUUM/ANALYZE schedule on PostgreSQL

#### Monitoring Targets
- [ ] FCP < 2s (95th percentile)
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] API p95 < 500ms
- [ ] Time to First Byte (TTFB) < 200ms
- [ ] k6 load test: 100 concurrent users, error rate < 1%, p95 < 500ms

---

## Area 2: Security Hardening

### Goal
Zero critical OWASP Top 10 vulnerabilities, encrypted data in transit and at rest, compliant authentication.

### Checklist

#### SSL/TLS
- [ ] Enforce HTTPS everywhere — HSTS header already set (`max-age=31536000; includeSubDomains`)
- [ ] TLS 1.2 minimum, TLS 1.3 preferred — configure at edge/proxy (Cloudflare/Railway)
- [ ] SSL certificate via Let's Encrypt (auto-renew) or managed certificate
- [ ] HTTP → HTTPS redirect at edge layer
- [ ] Certificate transparency logging enabled
- [ ] OCSP stapling enabled

#### OWASP Top 10 Protections
| # | Risk | Status | Required Action |
|---|------|--------|-----------------|
| A01 | Broken Access Control | ✅ Partial | RLS on all tables; verify admin role enforcement |
| A02 | Cryptographic Failures | ⚠️ Partial | TLS everywhere; encrypt sensitive DB fields |
| A03 | Injection | ✅ Partial | Zod validation on mutations; parameterized queries |
| A04 | Insecure Design | ⚠️ Partial | Add business logic enforcement (tier limits already done) |
| A05 | Security Misconfiguration | ⚠️ Partial | Remove build-time placeholder env vars |
| A06 | Vulnerable Components | ⚠️ Partial | `npm audit` shows 15 transitive vulns — monitor/update |
| A07 | Auth Failures | ✅ Partial | Password policy, lockout, MFA — add password reset (done) |
| A08 | Software/Data Integrity | ⚠️ Partial | SRI hashes for CDN scripts; code signing for CI |
| A09 | Logging Failures | ✅ Partial | Pino structured logging — add request IDs |
| A10 | SSRF | ❌ Missing | Validate/allowlist external URLs in conversion feature |

#### Authentication & Authorization
- [ ] Multi-factor authentication (TOTP) — already implemented (`src/lib/mfa.ts`)
- [ ] Password complexity enforcement — already implemented (8+ chars, 4 rules)
- [ ] Account lockout — already implemented (5 attempts → 15 min)
- [ ] Email verification enforcement — already in middleware
- [ ] Password reset flow — already implemented
- [ ] Session management — already implemented (list/revoke devices)
- [ ] CSRF protection — already implemented on all mutations
- [ ] Secure cookies — already implemented (`httpOnly`, `secure`, `sameSite=lax`)
- [ ] Role-based access control (RBAC) — admin routes protected
- [ ] OAuth providers (Google, GitHub) — optional for enterprise
- [ ] Session timeout and idle expiration — configure (e.g., 30 days absolute, 15 min idle)
- [ ] Concurrent session limits — optional for enterprise tier

#### Data Encryption
- [ ] Data in transit: TLS 1.3 for all external connections
- [ ] Data at rest: Supabase-managed encryption (AES-256) — verify enabled
- [ ] Sensitive fields (email, PII) — consider field-level encryption for high-sensitivity data
- [ ] Encryption key rotation — annual rotation schedule
- [ ] Stripe: never store raw card data; use Stripe tokens/PaymentMethods only

#### Additional Security
- [ ] Content Security Policy — already configured in middleware (tighten `unsafe-eval`/`unsafe-inline` where possible)
- [ ] Referrer Policy — already set (`strict-origin-when-cross-origin`)
- [ ] X-Content-Type-Options: nosniff — already set
- [ ] X-Frame-Options: DENY — already set
- [ ] Permissions-Policy — already set
- [ ] Rate limiting — already implemented (tiered: auth/docs/api)
- [ ] Webhook signature verification — already implemented for Stripe
- [ ] Secrets management — move to Railway/Vercel encrypted env vars (no `.env` files in repo)
- [ ] `npm audit` — reduce to 0 production vulnerabilities
- [ ] Dependency scanning in CI (Dependabot/Snyk)
- [ ] Penetration testing — schedule annual third-party pen test

---

## Area 3: Scalability & Infrastructure

### Goal
Support 10,000+ monthly active users, 99.9% uptime, horizontal scaling for traffic spikes.

### Checklist

#### Hosting Environment
- [ ] Production deployment on Railway (already configured) or Vercel/Cloudflare Pages
- [ ] Staging environment mirroring production (separate Supabase project, Redis instance)
- [ ] Development environment with local Supabase (Docker) or Supabase local CLI
- [ ] Environment variable separation: `.env.development`, `.env.staging`, `.env.production`
- [ ] No secrets committed to git — `.env*.local` in `.gitignore`
- [ ] CI/CD pipeline deploying to staging on PR, production on main branch merge

#### CDN Integration
- [ ] Cloudflare or Vercel Edge Network in front of application
- [ ] CDN caching for static assets (`/_next/static/*`, images, fonts)
- [ ] Edge functions for geolocation-based redirects (optional)
- [ ] Image optimization via CDN (Cloudflare Polish/Resizing or Vercel Image Optimization)
- [ ] DNS management via Cloudflare (SSL/TLS, WAF, DDoS protection)

#### Load Balancing
- [ ] Railway handles load balancing automatically for container deployments
- [ ] If self-hosted: nginx/HAProxy/Traefik in front of app instances
- [ ] Health check endpoint (`/api/health`) used by load balancer
- [ ] Connection draining during deployments
- [ ] Auto-scaling based on CPU/memory/request count

#### Database Optimization
- [ ] Supabase Production tier (not free tier) for commercial use
- [ ] PgBouncer connection pooling enabled in Supabase
- [ ] Read replicas for analytics/read-heavy queries
- [ ] Automated backups with 7-day+ retention (already configured)
- [ ] Point-in-Time Recovery (PITR) enabled (already configured)
- [ ] Database monitoring: connection count, query performance, replication lag
- [ ] Migration strategy: test rollback procedures in staging

#### Infrastructure as Code
- [ ] Define infrastructure as code (Terraform, Pulumi, or Railway config-as-code)
- [ ] Version control infrastructure definitions
- [ ] Disaster recovery runbook tested quarterly (already documented)

---

## Area 4: Reliability & Monitoring

### Goal
99.9% uptime SLA, <5 min mean time to detect (MTTD), <30 min mean time to recover (MTTR).

### Checklist

#### Error Logging
- [ ] Sentry fully integrated (client + server) — Sentry SDKs installed but verify source map upload in CI
- [ ] Structured logging with Pino — already implemented (`src/lib/logger.ts`)
- [ ] Request ID propagation — add middleware to generate and propagate `X-Request-ID`
- [ ] Log aggregation (Datadog, Logtail, or Cloudflare Logpush) — consider for production
- [ ] Error alerting: Slack/email notifications on critical errors (5xx, auth failures)
- [ ] Error rate thresholds: alert if >1% error rate over 5 min

#### Uptime Monitoring
- [ ] UptimeRobot or Pingdom monitoring on `/api/health` and homepage
- [ ] Monitoring interval: 1-5 min
- [ ] Alert channels: Slack, email, SMS (PagerDuty for on-call)
- [ ] Status page (optional): statuspage.io or Cachet for customer transparency

#### Automated Backups
- [ ] Supabase automated daily backups with 7-day retention (already configured)
- [ ] Point-in-Time Recovery (PITR) for last 7 days (already configured)
- [ ] Storage backup: sync Supabase Storage to secondary S3 bucket weekly
- [ ] Backup verification script — already exists (`scripts/verify-backup.js`) — run monthly
- [ ] Disaster recovery drill: semi-annual full infrastructure rebuild test

#### CI/CD Pipeline
- [ ] Lint + typecheck on every PR (already in CI)
- [ ] Unit + integration tests on every PR (already in CI)
- [ ] E2E tests (Playwright) on every PR — add critical path tests
- [ ] Build on every push to main
- [ ] Deploy to staging on PR merge to develop branch
- [ ] Deploy to production on merge to main (manual approval gate)
- [ ] Deployment verification: health check after deploy
- [ ] Rollback procedure: one-command rollback via Railway CLI
- [ ] Source map upload to Sentry in CI build step
- [ ] Dependency vulnerability scan in CI (npm audit / Dependabot)

#### Incident Response
- [ ] On-call rotation schedule
- [ ] Incident runbook (Severity 1-4 definitions, escalation matrix)
- [ ] Post-mortem template for Severity 1-2 incidents
- [ ] Slack channel for incident coordination

---

## Area 5: SEO & Accessibility

### Goal
Google Lighthouse score 90+ (SEO, Accessibility, Performance), WCAG 2.1 AA compliance.

### Checklist

#### Metadata & SEO
- [ ] Unique `<title>` and `<meta name="description">` on every page
- [ ] Open Graph tags (`og:title`, `og:description`, `og:image`, `og:type`, `og:url`)
- [ ] Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`)
- [ ] Canonical URLs on all pages
- [ ] `sitemap.xml` auto-generated (Next.js `sitemap.ts` or `next-sitemap`)
- [ ] `robots.txt` with sitemap reference and crawl rules
- [ ] JSON-LD structured data (Organization, WebSite, BreadcrumbList, Product/pricing)
- [ ] Semantic URL structure (`/pricing`, `/features`, `/solutions`, `/docs/[id]`)
- [ ] 301 redirects for any URL changes
- [ ] Hreflang tags if multi-language (optional)

#### Semantic HTML
- [ ] Proper heading hierarchy (h1 → h2 → h3, no skipped levels)
- [ ] `<main>`, `<nav>`, `<header>`, `<footer>`, `<article>`, `<section>`, `<aside>` landmarks
- [ ] `<label>` elements associated with all form inputs
- [ ] `<button>` for actions, `<a>` for navigation (correct element semantics)
- [ ] `alt` text on all images (decorative images use `alt=""`)
- [ ] Skip-to-content link for keyboard users
- [ ] `lang` attribute on `<html>` element
- [ ] ARIA labels where native HTML is insufficient

#### Mobile Responsiveness
- [ ] Mobile-first responsive design (Tailwind breakpoints: sm/md/lg/xl/2xl)
- [ ] Touch targets minimum 44x44px
- [ ] Readable text on small screens (16px base, no horizontal scrolling)
- [ ] Hamburger/off-canvas navigation on mobile
- [ ] Tested on iOS Safari, Chrome Android, Samsung Internet
- [ ] Viewport meta tag: `width=device-width, initial-scale=1`

#### WCAG 2.1 AA Compliance
- [ ] Color contrast ratio 4.5:1 (normal text), 3:1 (large text) — verify with axe-core or Lighthouse
- [ ] Keyboard navigability — all interactive elements reachable via Tab
- [ ] Focus indicators visible on all interactive elements
- [ ] Form error messages associated with inputs (`aria-describedby`, `aria-invalid`)
- [ ] Toast/notification announcements for screen readers (`aria-live="polite"`)
- [ ] No content that flashes more than 3 times per second
- [ ] PDF/document downloads have accessible filenames and titles
- [ ] Language changes marked with `lang` attribute (if applicable)

#### Testing
- [ ] Lighthouse CI: run on every PR, block merge if score < 90
- [ ] axe-core automated accessibility testing in CI
- [ ] Manual keyboard navigation testing
- [ ] Screen reader testing (NVDA, VoiceOver, JAWS)

---

## Area 6: Analytics & Compliance

### Goal
GDPR/CCPA compliant data collection, transparent privacy practices, actionable product analytics.

### Checklist

#### Analytics Integration
- [ ] Product analytics: Plausible, Fathom, or PostHog (privacy-focused, GDPR-friendly by default)
- [ ] Google Analytics 4 (optional — requires consent due to GDPR)
- [ ] Conversion tracking: signup activation, document creation, conversion usage, subscription upgrade
- [ ] Funnel analysis: landing → signup → verify → create doc → subscribe
- [ ] Custom events: document created, document edited, conversion started/completed, tier upgrade
- [ ] Dashboard for product metrics (DAU/MAU, churn, conversion rate, ARPU)

#### Cookie Consent
- [ ] Cookie consent banner on first visit (GDPR requirement for non-essential cookies)
- [ ] Granular consent categories: essential, analytics, marketing
- [ ] Consent storage and ability to withdraw/change preferences
- [ ] No tracking cookies set before consent
- [ ] Cookie policy page with table of all cookies used

#### Privacy & Legal
- [ ] Privacy Policy page: data collection, usage, sharing, retention, user rights
- [ ] Terms of Service page: acceptable use, liability, termination, governing law
- [ ] Data Processing Agreement (DPA) available for enterprise customers
- [ ] Right to access, rectify, erase (right to be forgotten) — implement account deletion API
- [ ] Data export API (GDPR Article 20 — data portability)
- [ ] Cookie Policy page
- [ ] Copyright/DMCA policy (if user-generated content)

#### Data Privacy Regulations
- [ ] **GDPR (EU):** Lawful basis for processing, consent records, DPA, breach notification (72 hrs), DPO contact (if required)
- [ ] **CCPA/CPRA (California):** "Do Not Sell My Personal Information" link, opt-out of sale/sharing, non-discrimination, consumer request verification
- [ ] **Data retention policy:** define retention periods for logs, documents, audit logs; automate deletion
- [ ] **Data breach procedure:** detection, containment, notification (users + authorities within 72 hrs GDPR)
- [ ] **Third-party processor list:** Subprocessors page (Supabase, Stripe, Resend, Railway, Sentry, etc.)

#### Compliance Documentation
- [ ] SOC 2 Type II readiness (if targeting enterprise) — start documentation
- [ ] Data Protection Impact Assessment (DPIA) for high-risk processing
- [ ] Vendor security assessments for critical sub-processors

---

## Technical Roadmap: Phased Implementation

### Phase 1: Critical Blockers (Week 1-2)
*Must complete before accepting paying customers*

| Priority | Task | Effort | Area |
|----------|------|--------|------|
| P0 | Configure production environment variables (no placeholders) | 2h | Reliability |
| P0 | Custom domain + SSL/TLS via Cloudflare/Railway | 4h | Security |
| P0 | Production Stripe webhook endpoint + end-to-end test | 4h | Security |
| P0 | Sentry source map upload in CI | 4h | Reliability |
| P0 | Uptime monitoring on `/api/health` + homepage | 2h | Reliability |
| P0 | Privacy Policy + Terms of Service pages | 8h | Compliance |
| P0 | Cookie consent banner + policy | 8h | Compliance |
| P0 | `npm audit` — resolve production vulnerabilities | 8h | Security |
| P0 | Lighthouse audit + fixes for 90+ score | 16h | SEO/Perf |

**Phase 1 Total: ~56 hours (1.5 weeks for 1 engineer)**

---

### Phase 2: Performance & Scalability (Week 3-4)

| Priority | Task | Effort | Area |
|----------|------|--------|------|
| P0 | Next.js image optimization (sharp, WebP, sizes, lazy loading) | 12h | Performance |
| P0 | CDN integration (Cloudflare) + long cache headers | 8h | Performance |
| P0 | ISR on marketing pages | 6h | Performance |
| P0 | Bundle analysis + tree-shaking | 6h | Performance |
| P0 | Redis connection pooling verification | 4h | Performance |
| P0 | Database index review + slow query optimization | 8h | Infrastructure |
| P0 | Staging environment mirroring production | 16h | Infrastructure |

**Phase 2 Total: ~60 hours**

---

### Phase 3: Observability & Reliability (Week 5)

| Priority | Task | Effort | Area |
|----------|------|--------|------|
| P0 | Request ID propagation + structured logging | 8h | Reliability |
| P0 | Log aggregation setup (Datadog/Logtail) | 8h | Reliability |
| P0 | Alerting rules (error rate, uptime, slow queries) | 8h | Reliability |
| P0 | E2E tests (Playwright critical paths) | 24h | Reliability |
| P0 | Disaster recovery drill + documentation test | 16h | Reliability |
| P0 | Rollback procedure documented + tested | 4h | Reliability |

**Phase 3 Total: ~68 hours**

---

### Phase 4: SEO & Accessibility (Week 6)

| Priority | Task | Effort | Area |
|----------|------|--------|------|
| P0 | Metadata (title, description, OG, Twitter) on all pages | 12h | SEO |
| P0 | sitemap.xml + robots.txt | 4h | SEO |
| P0 | JSON-LD structured data | 8h | SEO |
| P0 | Semantic HTML audit + fixes | 12h | Accessibility |
| P0 | Color contrast + keyboard navigation fixes | 12h | Accessibility |
| P0 | Lighthouse CI + axe-core in CI pipeline | 12h | SEO/Accessibility |

**Phase 4 Total: ~60 hours**

---

### Phase 5: Compliance & Analytics (Week 7-8)

| Priority | Task | Effort | Area |
|----------|------|--------|------|
| P0 | Analytics integration (Plausible/Fathom/PostHog) | 12h | Analytics |
| P0 | Conversion/funnel event tracking | 12h | Analytics |
| P0 | Data export API (GDPR portability) | 8h | Compliance |
| P0 | Account deletion API (GDPR right to erasure) | 8h | Compliance |
| P0 | Data retention policy + automation | 8h | Compliance |
| P0 | Subprocessors list page | 4h | Compliance |
| P0 | Breach notification procedure documentation | 4h | Compliance |

**Phase 5 Total: ~56 hours**

---

### Phase 6: Launch Preparation (Week 8-9)

| Priority | Task | Effort | Area |
|----------|------|--------|------|
| P0 | Production load test (k6, 100 concurrent users) | 8h | Performance |
| P0 | Penetration testing (OWASP Top 10) — external | 16h | Security |
| P0 | SOC 2 Type II readiness documentation (start) | 24h | Compliance |
| P0 | On-call rotation + incident runbook | 8h | Reliability |
| P0 | Go/No-Go launch review | 2h | All |

**Phase 6 Total: ~58 hours**

---

## Grand Total

| Phase | Hours | Weeks (1 eng) | Weeks (2-3 eng) |
|-------|-------|---------------|-----------------|
| Phase 1: Critical Blockers | 56h | 1.5 | 1 |
| Phase 2: Performance & Scalability | 60h | 1.5 | 1 |
| Phase 3: Observability & Reliability | 68h | 1.75 | 1 |
| Phase 4: SEO & Accessibility | 60h | 1.5 | 1 |
| Phase 5: Compliance & Analytics | 56h | 1.5 | 1 |
| Phase 6: Launch Preparation | 58h | 1.5 | 1 |
| **TOTAL** | **358h** | **~9 weeks** | **~4-5 weeks** |

---

## Success Criteria (Go/No-Go)

The platform is commercially viable when ALL of the following are true:

- [ ] TypeScript: 0 errors, Build: successful
- [ ] Tests: 80%+ unit test coverage, all integration tests passing
- [ ] Lighthouse: Performance 90+, Accessibility 90+, SEO 90+
- [ ] Security: 0 critical/high vulnerabilities, penetration test passed
- [ ] Uptime: 99.9% over 30-day monitoring period
- [ ] Load test: 100 concurrent users, p95 < 500ms, error rate < 1%
- [ ] Compliance: Privacy Policy, ToS, Cookie Consent, Data Export/Deletion live
- [ ] Monitoring: Sentry + uptime alerts configured and tested
- [ ] Backups: Verified restore test completed
- [ ] SSL/TLS: A+ grade on SSL Labs test

---

## Immediate Next Steps (This Week)

1. **Configure production environment variables** — replace all placeholder values in `.env.production.example`
2. **Set up custom domain + SSL** via Cloudflare/Railway
3. **Deploy Sentry with source map upload** in CI pipeline
4. **Create Privacy Policy and Terms of Service pages**
5. **Implement cookie consent banner**
6. **Run Lighthouse audit** and document baseline scores
7. **Configure uptime monitoring** on `/api/health`
