# ForgeDocs Automated Rollback Runbook

## Overview

This runbook defines the automated rollback procedures for ForgeDocs production deployments. It covers when to roll back, how to roll back, verification steps, and communication protocols.

## Rollback Triggers

A rollback should be initiated when ANY of the following conditions are met:

| Condition | Threshold | Detection Method |
|-----------|-----------|------------------|
| Error rate | > 1% over 5 minutes | Sentry / logs |
| P95 latency | > 2 seconds over 5 minutes | Health check / APM |
| Health check failures | `/api/health` returns non-200 for 2 consecutive checks | Uptime monitor |
| Deployment failure | CI/CD deploy job fails | GitHub Actions |
| Critical bug in production | User-reported or internal detection | Incident channel |
| Database migration failure | Migration fails or causes data corruption | Deploy logs |

## Rollback Procedure

### Option 1: Railway Platform Rollback (Recommended)

Railway maintains a history of deployed images. Roll back to the previous successful deployment:

```bash
# List recent deployments
railway deployment list --environment production

# Roll back to the previous deployment
railway rollback --environment production

# Verify rollback
railway deployment list --environment production
curl -f https://api.forgedocs.com/api/health
```

### Option 2: Manual Docker Image Rollback

If Railway rollback is unavailable, manually deploy the previous known-good image:

```bash
# Tag the previous stable image
docker tag ghcr.io/forgedocs/forgedocs:<previous-sha> ghcr.io/forgedocs/forgedocs:rollback

# Deploy via Railway
railway up --image ghcr.io/forgedocs/forgedocs:rollback --environment production
```

### Option 3: Database Migration Rollback

If a bad migration was applied:

```bash
# Check migration status
supabase migration list

# Roll back the last migration (down section must exist)
supabase db push --dry-run  # Verify before applying
# Apply down migration manually via Supabase SQL editor
```

**Never** roll back a migration that has been replicated to read replicas or downstream consumers without coordination.

## Automated Rollback in CI/CD

The `.github/workflows/ci-cd.yml` pipeline includes an automated rollback job that triggers on `deploy-production` failure:

1. Detects deployment failure via `needs: [deploy-production]` with `if: failure()`
2. Executes `railway rollback --environment production`
3. Sends alert to incident channel (Slack/email)
4. Creates incident ticket

## Post-Rollback Verification

After any rollback, verify:

1. **Health check**: `GET /api/health` returns 200 with all checks healthy
2. **Auth**: User can log in and access `/dashboard`
3. **Documents**: Create, read, update, delete operations work
4. **Billing**: Stripe webhooks are received and processed
5. **Worker**: Conversion jobs process successfully
6. **No data loss**: No user data was lost during the rollback window

## Communication Protocol

| Severity | Audience | Channel | SLA |
|----------|----------|---------|-----|
| P1 (Critical) | All customers | Status page, email | < 15 min |
| P2 (High) | Affected users | In-app notification | < 30 min |
| P3 (Medium) | Internal team | Slack #incidents | < 1 hour |

## Rollback Decision Matrix

| Scenario | Roll Back? | Reason |
|----------|-----------|--------|
| Error rate > 1% for 5 min | ✅ Yes | User impact |
| Health check degraded for 2 checks | ✅ Yes | Service unavailable |
| Single non-critical feature broken | ⚠️ Case-by-case | Assess blast radius |
| Performance regression < 20% | ❌ No | Monitor instead |
| Cosmetic UI issue | ❌ No | Fix forward |

## Rollback vs. Roll Forward

**Roll back when:**
- The deployment itself caused the issue
- A previous stable version is known good
- Data integrity is at risk
- Time to fix forward exceeds RTO

**Roll forward when:**
- The issue can be fixed with a hotfix in < 30 minutes
- Rolling back would cause data loss or inconsistency
- The previous version has known security vulnerabilities

## Rollback Testing

Test rollback procedures quarterly:

1. Deploy a canary build to staging
2. Trigger an artificial failure (e.g., break health check)
3. Execute the rollback procedure
4. Verify all post-rollback checks pass
5. Document time-to-rollback and update RTO if needed

## Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| Primary On-Call | oncall@forgedocs.com | Immediate |
| Engineering Lead | eng-lead@forgedocs.com | 15 min |
| Database Admin | dba@forgedocs.com | 30 min |
| Security Lead | security@forgedocs.com | Immediate |
