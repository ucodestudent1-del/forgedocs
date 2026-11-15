# ForgeDocs — Secrets Management & Rotation Strategy

## Overview

This document defines the secrets management policy for ForgeDocs, covering storage, rotation, and access control for all sensitive credentials used in production.

## Secret Inventory

| Secret | Source | Rotation Frequency | Storage |
|--------|--------|-------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings | On project migration | Runtime env (not in image) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings | On key reset | Runtime env (not in image) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings | Quarterly / on compromise | Runtime env + secrets manager |
| `STRIPE_SECRET_KEY` | Stripe Dashboard | Quarterly / on compromise | Runtime env + secrets manager |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard | On endpoint regeneration | Runtime env + secrets manager |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard | On key reset | Runtime env (not in image) |
| `RESEND_API_KEY` | Resend Dashboard | Quarterly / on compromise | Runtime env + secrets manager |
| `SENTRY_DSN` / `SENTRY_AUTH_TOKEN` | Sentry Project Settings | On project migration | Runtime env (not in image) |
| `REDIS_URL` | Redis provider | On credential rotation | Runtime env + secrets manager |

## Build-Time vs Runtime Secrets

### Build-time (baked into Docker image via `.env.build`)
- `NEXT_PUBLIC_SUPABASE_URL` — placeholder only, allows static generation
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — placeholder only
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — placeholder only
- `NEXT_PUBLIC_APP_URL` — placeholder only

**Never bake real secrets into the image.** `.env.build` contains placeholder values. Real values are injected at runtime via `docker-compose.yml` (`env_file: .env.production`) or the platform (Railway/Vercel environment variables).

### Runtime (injected at container start)
All production secrets above. Passed via environment variables, never written to disk.

## Secret Rotation Procedure

### 1. Supabase Anon Key Rotation
1. Generate new key in Supabase Project Settings → API
2. Add new `NEXT_PUBLIC_SUPABASE_ANON_KEY` to platform env vars
3. Deploy with both old and new values (dual-write period)
4. Remove old key after confirming all clients use new key
5. Rotate `SUPABASE_SERVICE_ROLE_KEY` similarly if needed

### 2. Stripe Secret Key Rotation
1. Create new restricted key in Stripe Dashboard → Developers → API keys
2. Add `STRIPE_SECRET_KEY` (new) to platform env vars
3. Test webhook endpoints with new key in staging
4. Rotate `STRIPE_WEBHOOK_SECRET` if webhook endpoint is regenerated
5. Revoke old Stripe key after 24 hours of successful traffic

### 3. Resend API Key Rotation
1. Create new API key in Resend Dashboard → API Keys
2. Add `RESEND_API_KEY` (new) to platform env vars
3. Send test email to verify delivery
4. Revoke old key after 24 hours

### 4. Redis Password Rotation
1. Rotate password in Redis provider console
2. Update `REDIS_URL` with new credentials
3. Restart application containers to pick up new URL
4. Verify cache connectivity in health check (`/api/health`)

### 5. Sentry DSN Rotation
1. Create new project in Sentry or rotate DSN in project settings
2. Update `SENTRY_DSN` and `SENTRY_AUTH_TOKEN`
3. Re-deploy with source map upload configuration

## External Secrets Manager Integration

For production deployments requiring SOC2 compliance, secrets should be stored in an external secrets manager rather than platform env vars.

### Supported Providers
- **AWS Secrets Manager** — primary recommendation for AWS deployments
- **HashiCorp Vault** — for self-managed / on-prem deployments
- **Google Secret Manager** — for GCP deployments

### Integration Pattern

```typescript
// src/lib/secrets.ts (example)
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"

const client = new SecretsManagerClient({ region: process.env.AWS_REGION })

export async function getSecret(secretId: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: secretId })
  const response = await client.send(command)
  return response.SecretString!
}
```

At container startup, fetch all secrets from the manager and inject them as environment variables before the Next.js server starts. The application code reads from `process.env` as usual — no code changes required.

### Rotation with Secrets Manager
1. Create new secret version in secrets manager
2. Platform picks up new version on next container restart
3. Application reads new value from `process.env`
4. Old version retained for rollback for 7 days

## Secret Validation at Startup

`src/lib/supabase.ts` already validates that Supabase env vars are present and not placeholders at runtime, throwing a clear error if missing. This prevents silent misconfiguration.

Add similar fail-fast validation for Stripe and Resend keys in production:

```typescript
// In server entry point or middleware initialization
if (process.env.NODE_ENV === "production") {
  for (const key of ["STRIPE_SECRET_KEY", "RESEND_API_KEY"]) {
    if (!process.env[key] || process.env[key].includes("placeholder")) {
      throw new Error(`Missing or placeholder ${key}`)
    }
  }
}
```

## Access Control

- Production secrets are accessible only to platform admins and the deployment pipeline
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — never expose to frontend or client-side code
- API keys issued to customers use `sk_live_` prefix and are hashed with SHA-256 before storage
- Raw API keys are shown to customers only once at creation time

## Audit

All secret access and rotation events are logged to `audit_logs` with severity `high` or `critical`. Secret rotation is recorded as an admin action with the rotating user's ID, timestamp, and affected secret type (name withheld).

## Emergency Revocation

In case of suspected compromise:
1. Immediately rotate all affected keys using the procedures above
2. Revoke all customer API keys via `DELETE /api/auth/api-keys`
3. Force all user sessions to re-authenticate via `POST /api/auth/sessions` (revoke all)
4. Review `audit_logs` for unauthorized access in the 24 hours prior to detection
