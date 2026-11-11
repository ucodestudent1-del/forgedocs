# ForgeDocs - Product Optimization Plan

## Phase 1 & 2: Audit Complete ✅

### Audit Summary
- **Tech Stack**: Next.js 15 App Router, React 19, Tailwind CSS, Supabase Auth/DB, Stripe, Resend, Redis, BullMQ
- **Auth**: Supabase Auth (email/password), CSRF protection, rate limiting, MFA, email verification
- **Database**: 14 Supabase tables with RLS, 5 migrations
- **Design System**: shadcn/ui components, CSS variable theming, Inter font, Lucide icons
- **Routes**: 7 public pages, 13 dashboard pages, 6 admin pages, 29 API routes
- **Technical Debt**: Stub toast notifications, duplicate signup endpoints, LibreOffice not containerized, stub toast

### Key Gaps Identified
1. Landing page missing: social proof, pricing, use cases, FAQ sections
2. `use-toast.ts` is a stub (no visual feedback for users)
3. Inconsistent layouts (dashboard sidebar vs admin top nav)
4. No mobile-responsive navigation in dashboard
5. Missing empty/error states on most pages
6. No API versioning

---

## Phase 3 & 4: Website Structure & Marketing Optimization

### Goals
- Transform homepage into professional SaaS marketing page
- Add Pricing, Features, Solutions, FAQ, About, Contact pages
- Hero → Social Proof → Features → Use Cases → Pricing → CTA hierarchy
- Seamless navigation between marketing and auth flows

### Implementation Plan

#### 3.1 Homepage Enhancement (`src/app/page.tsx`)
Current state: Basic hero, 3 features, CTA

Changes:
- **Hero Section**: Enhanced typography, sub-headline, dual CTAs (Get Started / Browse Templates), trust badges
- **Social Proof Section**: Customer logos, testimonials, stats (documents processed, conversions, teams)
- **Features Section**: 6 features with icons, benefit-focused copy
- **Use Cases Section**: 4 use case cards (Legal, Finance, HR, Education)
- **Pricing Section**: 3 tiers (Free/Pro/Business) with feature comparison
- **FAQ Section**: 6 accordion-style questions
- **Final CTA**: Centered conversion section

#### 3.2 New Pages
| Page | Path | Purpose |
|------|------|---------|
| Pricing | `/pricing` | 3-tier pricing table with feature comparison |
| Features | `/features` | Detailed feature breakdown with screenshots |
| Solutions | `/solutions` | Industry-specific use cases |
| FAQ | `/faq` | Accordion FAQ |
| About | `/about` | Company story, team, values |
| Contact | `/contact` | Contact form, support info |

#### 3.3 Navigation Updates
- Add marketing page links to landing page nav
- Add "Pricing" link to dashboard sidebar
- Ensure seamless auth flow: marketing → /auth/login or /auth/signup → /dashboard

---

## Phase 5: User Journey & Onboarding (Future)
- Fix onboarding step 2 (document-generator doesn't read template query param)
- Add blank document creation flow
- Visual step completion indicators

## Phase 6 & 7: Dashboard & UI/UX (Future)
- Real toast notifications (replace stub)
- Unified dashboard + admin layouts
- Mobile-responsive navigation
- Empty/error states
- Consistent typography scale

## Phase 8: QA (Future)
- End-to-end testing
- Responsive testing
- Console error check

---

## Execution Rules Followed
- ✅ Preserve all existing functionality
- ✅ No mock replacements
- ✅ Maintain compatibility with auth, database, API integrations
- ✅ Incremental development (audit first, then implement)
