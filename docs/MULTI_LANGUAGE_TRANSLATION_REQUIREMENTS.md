# ForgeDocs Multi-Language Translation Integration
## Technical Requirements Document & Implementation Strategy

**Platform:** ForgeDocs SaaS  
**Framework:** Next.js 15 (App Router), React 19, Supabase, TypeScript  
**Existing i18n:** next-intl v4.15.1, 7 locales (en, es, ar, fr, de, ja, zh)  
**Status:** Discovery & Planning Phase

---

## 1. Executive Summary

ForgeDocs already has a foundational i18n implementation using `next-intl` with JSON message files, locale-prefixed routing (`as-needed`), RTL support for Arabic, and a custom `I18nProvider` wrapper. This document expands that foundation into a comprehensive, production-grade multi-language translation feature spanning the entire SaaS platform: UI strings, dynamic content, user-generated content, settings persistence, and translation workflow automation.

## 2. Current State Assessment

### 2.1 Existing i18n Infrastructure

| Component | Location | Details |
|-----------|----------|---------|
| Locale config | `next-intl.config.js` | 7 locales, default `en`, prefix `as-needed` |
| Routing config | `src/i18n/routing.ts` | `defineRouting` with same locales |
| next-intl config | `src/i18n/config.ts` | Wraps routing into next-intl config |
| Client provider | `src/lib/i18n.tsx` | Custom `I18nProvider` + `useTranslations` + `useLocale` |
| Messages | `src/messages/*.json` | 7 JSON files, flat + nested structure with ICU plurals/datetime |
| Middleware | `src/middleware.ts` | Locale detection (pathname > cookie > Accept-Language), redirect |
| Layout | `src/app/[locale]/layout.tsx` | `I18nProvider`, `dir` attribute for RTL |
| Language switcher | `src/components/ui/language-switcher.tsx` | DropdownMenu, native names, RTL flag per locale |
| Settings persistence | `src/app/[locale]/(dashboard)/settings/page.tsx` | Profile `language` field (local state only, not yet synced to DB) |
| Type declarations | `src/i18n.d.ts` | Module augmentation for `next-intl` Messages |

### 2.2 Gaps & Limitations

1. **Custom provider duplicates next-intl**: `src/lib/i18n.tsx` re-implements `useTranslations`/`useLocale` instead of using next-intl's `useTranslations` from `next-intl` directly, causing two parallel i18n systems.
2. **No server-side translations**: Messages are loaded entirely client-side; server components and Server Actions cannot translate strings.
3. **Language preference not persisted to DB**: `profile.language` is local state only; cookie-based storage in the custom provider is not shared with middleware detection reliably.
4. **No translation workflow tooling**: No extraction, validation, or sync scripts for JSON message files.
5. **No dynamic/UGC translation strategy**: Document content, comments, and AI-generated text have no translation path.
6. **RTL limited to Arabic only**: No generalized RTL CSS handling beyond `dir` attribute.

---

## 3. Architecture: Client-Side vs. Server-Side Localization

### 3.1 Recommendation: Hybrid Architecture

Use a **hybrid approach**: server-side for static UI strings and initial page render, client-side for interactive language switching and dynamic content. This balances SEO, performance, and UX.

### 3.2 Decision Matrix

| Criterion | Client-Side Only | Server-Side Only | Hybrid (Recommended) |
|-----------|-----------------|------------------|---------------------|
| SEO / crawlability | Poor (JS-dependent) | Excellent | Excellent |
| Initial render (LCP) | Slower (JS hydration) | Fast | Fast |
| Language switch UX | Instant, no reload | Full page reload | Instant + preserved session |
| Server component support | No | Yes | Yes (static strings) |
| Client interactivity | Native | Requires reload | Native |
| Complexity | Low | Medium | Medium |
| next-intl fit | Partial | Partial | Full |

### 3.3 Implementation Pattern

- **Server Components**: Use `next-intl/server` `getTranslations` for static strings during SSR.
- **Client Components**: Use `next-intl` `useTranslations` / `useLocale` for interactive UI.
- **Language switcher**: Client-side `router.push` to the locale-prefixed route; session and cookies preserved.
- **Middleware**: Detects locale from cookie > Accept-Language > default, redirects to `/:locale*` path, sets `locale` cookie.
- **Persistence**: Store preferred locale in `profiles.language` (Supabase) and sync to cookie on login/settings save.

---

## 4. Translation File Management Strategy

### 4.1 Recommendation: JSON + next-intl (keep existing), with optional Headless CMS for marketing content

Continue with JSON message files managed via next-intl. This is the best fit for a Next.js app with strong type safety and zero runtime fetch overhead. Evaluate a Headless CMS (e.g., Contentful, Strapi, or Supabase-based) only for long-form marketing/blog content that non-technical editors update frequently.

### 4.2 Format Comparison

| Format | Pros | Cons | Verdict |
|--------|------|------|---------|
| **JSON (next-intl)** | Type-safe, zero build-step fetch, next-intl native, ICU support | Manual file sync, no UI for translators | **Adopt** (core UI) |
| Gettext (.po/.mo) | Industry standard, plural handling, tooling mature | Not native to Next.js/next-intl, build step required | Reject |
| Headless CMS | Non-technical editing, dynamic updates, no deploys for copy changes | Runtime fetch, extra cost, caching complexity, type safety weaker | Evaluate for marketing content only |
| CSV/XLSX | Easy for translators | Not native, requires conversion step | Reject as source of truth |

### 4.3 File Structure

```
src/messages/
  en.json          # Source of truth (English)
  es.json
  ar.json
  fr.json
  de.json
  ja.json
  zh.json
  index.ts         # Generated type-safe messages map
```

### 4.4 Message Key Conventions

- Use dot-notation namespaces: `common.save`, `navigation.dashboard`, `editor.wordCount`
- ICU message syntax for plurals: `{count, plural, one {# document} other {# documents}}`
- ICU for datetime/number: `{date, datetime, medium}`
- Never embed variables inside translated strings; use placeholders
- Avoid splitting sentences across keys

### 4.5 Translation Workflow

1. **Source extraction**: Extract strings from components into `en.json` (source of truth).
2. **Translation**: Send `en.json` to translators (internal or agency) or use API pre-translation.
3. **Review**: Bilingual reviewer signs off per locale.
4. **CI validation**: Fail build if any locale is missing keys present in `en.json`.
5. **Deploy**: Ship updated JSON files with the release.

---

## 5. Implementation Methods: Automated API vs. Manual Workflow

### 5.1 Comparison

| Approach | Google Cloud Translation | DeepL | Manual (Human) | Hybrid |
|----------|-------------------------|-------|----------------|--------|
| Cost | $20/M | $25/M+ chars | Highest ($0.10+/word) | Medium |
| Quality | Good for UI, variable for nuance | High for EU languages, lower for JA/ZH/AR | Highest, culturally accurate | High |
| Speed | Instant | Instant | Days-weeks | Fast draft + human review |
| API limits | High | High | N/A | N/A |
| next-intl fit | JSON post-process | JSON post-process | N/A | N/A |
| Best for | Drafts, UGC, high volume | Drafts, EU markets | Legal, marketing, brand voice | Production release |

### 5.2 Recommendation: Hybrid Workflow

- **Phase 1 (MVP)**: Human translation for core UI strings (`en.json` → all locales). Ensures brand voice and accuracy.
- **Phase 2**: Automated pre-translation via DeepL/Google Cloud Translation API for new strings, queued for human review before merge.
- **Phase 3**: Real-time automated translation for user-generated content (document content, comments) with optional human review for high-value content.

### 5.3 API Integration Pattern (Server-Side)

```ts
// src/lib/translation-api.ts (server-only)
import { translate } from "@google-cloud/translate" // or deep-l

export async function preTranslateKeys(
  keys: Record<string, string>,
  targetLocale: string
): Promise<Record<string, string>> {
  // Call translation API, return { key: translatedValue }
}
```

Run as a script, not at runtime, to avoid per-request cost and latency. Store results in JSON files.

---

## 6. User Experience (UX) Design

### 6.1 Language Switcher Requirements

| Requirement | Specification |
|-------------|---------------|
| Placement | Top navbar (global) + Settings > Profile > Language (account-level) |
| Trigger | Click dropdown, not hover (accessibility) |
| Display | Native language name (e.g., "English", "Español", "العربية") + optional flag |
| Current state | Checkmark indicator on selected locale |
| RTL support | `dir="rtl"` on `<html>`/`<body>`, flipped layout for Arabic |
| Persistence | Cookie + `profiles.language` in Supabase |
| Session preservation | Language change does NOT log out or lose unsaved drafts |
| URL | Locale prefix preserved: `/es/dashboard`, `/ar/editor` |
| Focus management | Focus trapped in dropdown, returns to trigger on close |
| ARIA | `aria-label`, `aria-checked`, `role="menuitemradio"` |

### 6.2 Seamless Transition Strategy

1. **No full-page reload**: Client-side `router.push(newLocalePath)` + `router.refresh()`.
2. **Preserve state**: React Query cache, form drafts, editor content retained via client-side state (not lost on locale change).
3. **Cookie sync**: `setLocale` writes `locale` cookie read by middleware on next navigation.
4. **Flash prevention**: Server renders in detected locale; client hydrates matching locale to avoid content flash.
5. **Redirect handling**: Middleware redirects root `/` → `/:locale` on first visit based on Accept-Language/cookie.

### 6.3 RTL Layout Considerations

- `dir` attribute on root element (already implemented in layout).
- CSS logical properties: `margin-inline-start`, `padding-inline-end`, `text-align: start/end`.
- Flip icons/mirrors for Arabic (search icon, chevrons, sidebar direction).
- next-intl handles RTL detection via `locale === "ar"`; generalize with an `rtl` locale map.

---

## 7. Scalability Strategy

### 7.1 Dynamic Content (Documents, Templates)

Documents are user-authored and stored in Supabase. Translating them requires a separate strategy from UI strings.

**Approach: Document Translations Table**

```sql
CREATE TABLE document_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT,
  content TEXT,
  summary TEXT,
  translated_at TIMESTAMPTZ DEFAULT NOW(),
  translation_source TEXT CHECK (translation_source IN ('human', 'api', 'auto')),
  reviewed BOOLEAN DEFAULT FALSE,
  reviewer_id UUID REFERENCES profiles(id),
  UNIQUE(document_id, locale)
);

CREATE INDEX idx_document_translations_document_id ON document_translations(document_id);
CREATE INDEX idx_document_translations_locale ON document_translations(locale);
```

- Original document retains source language content.
- Translations linked by `document_id` + `locale`.
- Reader UI fetches translation matching user's locale, falls back to source.

### 7.2 User-Generated Content (UGC)

Comments, annotations, AI-generated content:

- **Real-time**: Auto-translate on write via API (Google Cloud/DeepL), store both original and translated versions.
- **On-demand**: "Translate" button fetches translation server-side, caches in Redis for 24h.
- **Moderation**: Flagged content routed to human reviewers.

### 7.3 Adding New Locales Efficiently

| Step | Action | Owner |
|------|--------|-------|
| 1 | Add locale code to `locales` array in config, routing, middleware, language-switcher | Developer |
| 2 | Create `src/messages/<locale>.json` seeded from `en.json` | Developer + translator |
| 3 | Add migration for any DB locale-specific columns | Developer |
| 4 | Update `i18n.d.ts` / messages index | Developer |
| 5 | RTL flag if applicable | Developer + designer |
| 6 | CI validation: ensure all `en.json` keys present | CI pipeline |
| 7 | Deploy | Developer |

### 7.4 Caching Strategy

- **Translation JSON**: Imported at build time (zero runtime fetch).
- **Document translations**: Supabase query + Redis cache keyed by `document_id:locale`.
- **UGC translations**: Redis cache with 24h TTL; invalidate on content edit.

---

## 8. Technical Stack Integration

### 8.1 Frontend (Next.js 15 + React 19)

**Replace custom `src/lib/i18n.tsx` with next-intl native hooks:**

- Use `import { useTranslations, useLocale } from "next-intl"` in client components.
- Use `import { getTranslations } from "next-intl/server"` in server components.
- Keep `I18nProvider` from `next-intl` in `layout.tsx` (via `next-intl` `appRouter` wrapper).

**Migration Steps:**
1. Install `next-intl` (already installed).
2. Replace `src/lib/i18n.tsx` imports across components with `next-intl` imports.
3. Remove custom `I18nProvider` wrapper; use next-intl's `NextIntlClientProvider` / `appRouter` pattern.
4. Update `src/i18n.d.ts` to reference generated messages type.

### 8.2 Backend (Supabase + Next.js API Routes)

- **Profiles**: Add `language` column to `profiles` table (migration).
- **Middleware**: Read `profiles.language` after auth, sync to cookie for locale detection.
- **Server Actions**: Accept locale, validate against allowed list, update `profiles.language` + cookie.
- **API routes**: Locale-aware error messages via `getTranslations` from `next-intl/server`.

### 8.3 Database Schema Changes

```sql
-- profiles.language (add to existing profiles table)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- document_translations table (new)
-- (see Section 7.1)

-- translation_jobs table (for async API translation tracking)
CREATE TABLE translation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  target_locale TEXT,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### 8.4 Type Safety

- Generate TypeScript types from `en.json` schema using a build script or `next-intl`'s built-in typing.
- `src/i18n.d.ts` module augmentation maps `Messages` to the source locale.
- Zod schemas for API payloads that accept locale parameters.

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Unify i18n: replace custom provider with next-intl native hooks.
- Add `profiles.language` DB column + migration.
- Sync settings language selection to DB + cookie.
- Harden middleware locale detection (cookie → profile → Accept-Language → default).
- Add RTL CSS logical properties for Arabic.

### Phase 2: Translation Workflow (Weeks 3-4)
- Create translation extraction script (`npm run i18n:extract`).
- Add CI validation: missing keys fail build.
- Add `npm run i18n:pretranslate` script (DeepL/Google Cloud) with human-review queue.
- Review all 7 locale JSON files for completeness.

### Phase 3: Dynamic Content (Weeks 5-6)
- `document_translations` table + RLS policies.
- Reader locale fallback logic (user locale → document source locale → en).
- "Translate document" action (API pre-translation + store).
- UGC on-demand translation with Redis caching.

### Phase 4: Polish & Scale (Weeks 7-8)
- E2E tests (Playwright) for language switcher + RTL.
- Load test (k6) for locale-heavy traffic.
- Headless CMS evaluation for marketing/blog content.
- Documentation & runbook for adding new locales.

---

## 10. Validation & Testing

| Test Type | Tool | Scope |
|-----------|------|-------|
| Unit | Jest | `useTranslations`, `useLocale`, middleware locale detection |
| Integration | Jest + Supabase | Profile language persistence, document translation fallback |
| E2E | Playwright | Language switcher, RTL layout, settings persistence |
| Load | k6 | Multi-locale concurrent traffic, translation API rate limits |
| Lint/Typecheck | `next lint`, `tsc` | i18n type safety, unused keys |

**Commands to run:**
- `npm run lint`
- `npm run build` (typecheck via `tsc` in build)
- `npm test`
- `npm run test:e2e`

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Translation API cost spiral | High | Run pre-translation at build/CI time, not per-request; cache results |
| Missing keys in non-EN locales | Medium | CI validation fails build on missing keys |
| RTL layout bugs | Medium | Dedicated QA pass for Arabic; logical CSS properties |
| Session loss on language switch | Medium | Client-side router + cookie persistence, no auth invalidation |
| Stale translations after source edit | Medium | Versioned message keys; mark translations "needs review" when EN changes |

---

## 12. Appendix: Key File References

| File | Purpose |
|------|---------|
| `next-intl.config.js` | Locale & prefix config |
| `src/i18n/config.ts` | next-intl config wrapper |
| `src/i18n/routing.ts` | Locale routing definition |
| `src/i18n.d.ts` | TypeScript module augmentation |
| `src/lib/i18n.tsx` | Custom i18n provider (to be replaced) |
| `src/messages/*.json` | Translation strings (7 locales) |
| `src/middleware.ts` | Locale detection & redirect |
| `src/app/[locale]/layout.tsx` | Locale layout + RTL dir |
| `src/components/ui/language-switcher.tsx` | Language switcher UI |
| `src/app/[locale]/(dashboard)/settings/page.tsx` | User language preference |
| `supabase/migrations/001_initial_schema.sql` | Profiles table schema |
