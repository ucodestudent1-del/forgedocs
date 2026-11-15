#!/usr/bin/env node
/**
 * Database Migration Runner for ForgeDocs
 * Run with: node scripts/migrate.js [up|down|status]
 */

const { createClient } = require("@supabase/supabase-js")
const fs = require("fs")
const path = require("path")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const MIGRATIONS_DIR = path.join(__dirname, "../supabase/migrations")

async function ensureMigrationsTable() {
  const { error } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum VARCHAR(64)
      );
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
    `,
  })
  if (error) {
    console.error("Failed to create migrations table:", error)
    process.exit(1)
  }
}

async function getAppliedMigrations() {
  const { data, error } = await supabase
    .from("schema_migrations")
    .select("version")
    .order("version", { ascending: true })
  
  if (error) {
    console.error("Failed to get applied migrations:", error)
    process.exit(1)
  }
  return data.map(m => m.version)
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return []
  }
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort()
}

async function calculateChecksum(content) {
  const crypto = require("crypto")
  return crypto.createHash("sha256").update(content).digest("hex")
}

async function runMigration(file, direction = "up") {
  const filePath = path.join(MIGRATIONS_DIR, file)
  const content = fs.readFileSync(filePath, "utf8")
  const checksum = await calculateChecksum(content)
  
  // Split into up/down sections
  const sections = content.split(/^---\s*(up|down)\s*---/gm)
  let sql = ""
  if (direction === "up") {
    // Find content between --- up --- and --- down ---
    const upMatch = content.match(/---\s*up\s*---([\s\S]*?)(?:---\s*down\s*---|$)/i)
    sql = upMatch ? upMatch[1] : content
  } else {
    const downMatch = content.match(/---\s*down\s*---([\s\S]*)/i)
    sql = downMatch ? downMatch[1] : ""
  }

  if (!sql.trim()) {
    console.log(`  No ${direction} migration found in ${file}`)
    return true
  }

  console.log(`  Running ${direction} migration: ${file}`)
  
  // Execute SQL
  const { error } = await supabase.rpc("exec_sql", { sql })
  if (error) {
    console.error(`  Failed to run ${direction} migration: ${file}`)
    console.error(`  Error: ${error.message}`)
    return false
  }

  if (direction === "up") {
    const { error: recordError } = await supabase
      .from("schema_migrations")
      .insert({ version: file, name: file.replace(".sql", ""), checksum })
    if (recordError) {
      console.error(`  Failed to record migration: ${recordError.message}`)
      return false
    }
  } else {
    const { error: deleteError } = await supabase
      .from("schema_migrations")
      .delete()
      .eq("version", file)
    if (deleteError) {
      console.error(`  Failed to remove migration record: ${deleteError.message}`)
      return false
    }
  }

  console.log(`  ✓ ${direction} migration completed: ${file}`)
  return true
}

async function migrateUp() {
  const applied = await getAppliedMigrations()
  const files = getMigrationFiles()
  
  const pending = files.filter(f => !applied.includes(f))
  
  if (pending.length === 0) {
    console.log("No pending migrations")
    return true
  }

  console.log(`Running ${pending.length} pending migrations...`)
  
  for (const file of pending) {
    const success = await runMigration(file, "up")
    if (!success) {
      console.error("Migration failed!")
      return false
    }
  }
  
  console.log("All migrations applied successfully!")
  return true
}

async function migrateDown(steps = 1) {
  const applied = await getAppliedMigrations()
  
  if (applied.length === 0) {
    console.log("No applied migrations to roll back")
    return true
  }

  const toRollback = applied.slice(-steps).reverse()
  
  console.log(`Rolling back ${toRollback.length} migrations...`)
  
  for (const file of toRollback) {
    const success = await runMigration(file, "down")
    if (!success) {
      console.error("Rollback failed!")
      return false
    }
  }
  
  console.log("Rollback completed!")
  return true
}

async function status() {
  const applied = await getAppliedMigrations()
  const files = getMigrationFiles()
  
  console.log("Migration Status:")
  console.log("=================")
  
  for (const file of files) {
    const status = applied.includes(file) ? "✓ Applied" : "✗ Pending"
    console.log(`  ${file}: ${status}`)
  }
  
  console.log(`\nTotal: ${files.length} migrations, ${applied.length} applied, ${files.length - applied.length} pending`)
}

async function main() {
  const command = process.argv[2] || "status"
  const arg = process.argv[3]

  await ensureMigrationsTable()

  switch (command) {
    case "up":
      await migrateUp()
      break
    case "down":
      const steps = parseInt(arg) || 1
      await migrateDown(steps)
      break
    case "status":
    default:
      await status()
      break
  }
}

main().catch(console.error)