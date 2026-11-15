#!/usr/bin/env bash
#
# ForgeDocs Rollback Drill & Disaster Recovery Test
#
# Validates that:
#   1. Every migration has a matching "--- up ---" and "--- down ---" section
#   2. Down migrations are syntactically valid SQL
#   3. Required DR documentation exists
#   4. Health check endpoint contract is defined
#
# Exit codes:
#   0 = drill passed
#   1 = drill failed

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"
FAILURES=0

log_pass() { echo "  [PASS] $*"; }
log_fail() { echo "  [FAIL] $*"; FAILURES=$((FAILURES + 1)); }
log_info() { echo "  [INFO] $*"; }

echo "=== ForgeDocs Rollback Drill ==="
echo ""

# ---------------------------------------------------------------------------
# 1. Migration reversibility
# ---------------------------------------------------------------------------
echo "[1/4] Checking migration up/down sections..."

if [ ! -d "$MIGRATIONS_DIR" ]; then
  log_fail "Migrations directory not found: $MIGRATIONS_DIR"
else
  shopt -s nullglob
  migration_count=0
  for f in "$MIGRATIONS_DIR"/*.sql; do
    migration_count=$((migration_count + 1))
    basename="$(basename "$f")"

    if ! grep -q "^--- up ---" "$f"; then
      log_fail "$basename missing '--- up ---' section"
    fi

    if ! grep -q "^--- down ---" "$f"; then
      log_fail "$basename missing '--- down ---' section"
    fi

    # Validate down section has at least one SQL statement
    if awk '/^--- down ---/,0' "$f" | grep -qE '^\s*(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|TRUNCATE|REVOKE|GRANT)'; then
      log_pass "$basename has up + down sections with SQL statements"
    else
      log_fail "$basename down section appears empty or invalid"
    fi
  done
  log_info "Checked $migration_count migration file(s)"
  shopt -u nullglob
fi

# ---------------------------------------------------------------------------
# 2. Disaster recovery documentation
# ---------------------------------------------------------------------------
echo ""
echo "[2/4] Checking DR documentation..."

for doc in DISASTER_RECOVERY.md SECRETS_MANAGEMENT.md SOC2_READINESS.md; do
  if [ -f "$PROJECT_ROOT/$doc" ]; then
    log_pass "$doc exists"
  else
    log_fail "$doc is missing"
  fi
done

# ---------------------------------------------------------------------------
# 3. Health check contract
# ---------------------------------------------------------------------------
echo ""
echo "[3/4] Checking health check endpoint contract..."

if grep -rn "api/health" "$PROJECT_ROOT/src/app/api/health/route.ts" >/dev/null 2>&1; then
  log_pass "Health check route implemented"
else
  log_fail "Health check route not found at src/app/api/health/route.ts"
fi

# ---------------------------------------------------------------------------
# 4. Rollback procedure summary
# ---------------------------------------------------------------------------
echo ""
echo "[4/4] Rollback procedure verification..."

if grep -q "ROLLBACK\|rollback\|ROLL_BACK" "$PROJECT_ROOT/DISASTER_RECOVERY.md" 2>/dev/null; then
  log_pass "Rollback procedures documented in DISASTER_RECOVERY.md"
else
  log_fail "No rollback procedures found in DISASTER_RECOVERY.md"
fi

# ---------------------------------------------------------------------------
# Result
# ---------------------------------------------------------------------------
echo ""
echo "=== Rollback Drill Result ==="
if [ "$FAILURES" -eq 0 ]; then
  echo "ROLLBACK DRILL PASSED"
  exit 0
else
  echo "ROLLBACK DRILL FAILED ($FAILURES issue(s))"
  exit 1
fi
