# ForgeDocs Disaster Recovery Runbook

## Overview
This runbook describes the disaster recovery procedures for ForgeDocs platform.

## Recovery Objectives
- **RTO (Recovery Time Objective):** < 4 hours
- **RPO (Recovery Point Objective):** < 1 hour

---

## Backup Strategy

### Automated Backups (Supabase Managed)
- **Database:** Daily automated backups with 7-day retention
- **Point-in-time Recovery:** Available for last 7 days
- **Storage:** Automated backups to Supabase managed storage

### Manual Backup Procedures
```bash
# Export database schema
pg_dump --schema-only -h <host> -U postgres postgres > schema_backup.sql

# Export data (excluding large objects)
pg_dump --data-only -h <host> -U postgres postgres > data_backup.sql

# Full backup
pg_dump -h <host> -U postgres postgres > full_backup.sql
```

### Document Storage Backup
```bash
# Sync Supabase storage to local/remote backup
aws s3 sync s3://forgedocs-storage s3://forgedocs-backup/$(date +%Y%m%d)/
```

---

## Recovery Procedures

### Scenario 1: Database Corruption
**RTO: 2 hours**

1. Identify corruption scope
2. Stop application traffic (maintenance mode)
3. Restore from latest clean backup:
   ```bash
   psql -h <host> -U postgres -d postgres < full_backup.sql
   ```
3. Verify data integrity
4. Re-enable application traffic
5. Run health checks: `curl https://your-app.railway.app/api/health`

### Scenario 2: Data Deletion (Accidental)
**RTO: 1 hour**

1. Identify deleted records and time of deletion
2. Use Supabase Point-in-Time Recovery:
   - Go to Supabase Dashboard > Database > Backups
   - Select "Point in Time Recovery"
   - Choose timestamp before deletion
   - Restore to new database
3. Export recovered data and merge with production
4. Verify data integrity

### Scenario 3: Complete Infrastructure Loss
**RTO: 4 hours**

1. Provision new infrastructure:
   ```bash
   # Railway: New project from GitHub
   railway init --from-github <repo-url>
   ```

2. Restore database from backup:
   ```bash
   # Apply schema
   psql -h <new-host> -U postgres -d postgres < schema_backup.sql
   
   # Apply data
   psql -h <new-host> -U postgres -d postgres < data_backup.sql
   ```

3. Reconfigure environment variables in Railway
4. Deploy application:
   ```bash
   railway up --environment production
   ```

4. Verify health: `curl https://app.railway.app/api/health`

### Scenario 5: Security Breach
**RTO: 2 hours**

1. Immediately rotate all secrets:
   - Supabase keys
   - Stripe keys
   - JWT secrets
   - Database passwords

2. Invalidate all user sessions
5. Audit audit_log for suspicious activity
6. Force password reset for all users
6. Deploy with new secrets

---

## Verification Checklist

After any recovery:
- [ ] `/api/health` returns 200
- [ ] User can login successfully
- [ ] Document CRUD operations work
- [ ] Conversion jobs process correctly
- [ ] Billing page loads correctly
- [ ] All 17 pages load without errors

---

## Contact Information

| Role | Contact | Escalation |
|------|---------|------------|
| Primary On-Call | <oncall@forgedocs.com> | Immediate |
| Database Admin | <dba@forgedocs.com> | 30 min |
| Security Lead | <security@forgedocs.com> | Immediate |
| Engineering Lead | <eng-lead@forgedocs.com> | 15 min |

---

## Testing Schedule

| Test | Frequency | Last Tested |
|------|-----------|-------------|
| Full backup restore | Monthly | - |
| Point-in-time recovery | Quarterly | - |
| Full infrastructure rebuild | Semi-annually | - |
| Security breach simulation | Quarterly | - |

---

*Last Updated: 2026-11-08*
*Version: 1.0*
*Owner: Platform Engineering*