/**
 * i18n:extract - Extract translation keys from source code and compare against message files.
 *
 * Usage:
 *   node scripts/i18n/extract.js          # Report missing/extra keys per locale
 *   node scripts/i18n/extract.js --validate  # Exit non-zero if any locale is missing keys from en.json
 */

const fs = require("fs")
const path = require("path")

const ROOT = process.cwd()
const MESSAGES_DIR = path.join(ROOT, "src", "messages")
const LOCALES = ["en", "es", "ar", "fr", "de", "ja", "zh"]
const DEFAULT_LOCALE = "en"

// Simple regex to find t("namespace.key") and t("key") call sites in .ts/.tsx files
const T_CALL_RE = /t\(["']([^"']+)["']\)/g
// Also catch namespace-qualified useTranslations("ns") then t("key") - handled by scanning t() calls only

function extractKeysFromFile(filePath) {
  let content
  try {
    content = fs.readFileSync(filePath, "utf8")
  } catch {
    return new Set()
  }
  const keys = new Set()
  let match
  while ((match = T_CALL_RE.exec(content)) !== null) {
    keys.add(match[1])
  }
  return keys
}

function walkDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkDir(full, fileList)
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      fileList.push(full)
    }
  }
  return fileList
}

function flattenKeys(obj, prefix = "") {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullKey))
    } else {
      result[fullKey] = value
    }
  }
  return result
}

function loadMessageFile(locale) {
  const file = path.join(MESSAGES_DIR, `${locale}.json`)
  if (!fs.existsSync(file)) return {}
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

function main() {
  const validate = process.argv.includes("--validate")

  const sourceFiles = walkDir(path.join(ROOT, "src"))
  const usedKeys = new Set()
  for (const file of sourceFiles) {
    for (const k of extractKeysFromFile(file)) {
      usedKeys.add(k)
    }
  }

  const defaultMessages = flattenKeys(loadMessageFile(DEFAULT_LOCALE))
  const defaultKeys = new Set(Object.keys(defaultMessages))

  let hasIssues = false

  console.log(`\n${"=".repeat(60)}`)
  console.log(` i18n key extraction report`)
  console.log(`${"=".repeat(60)}\n`)
  console.log(`Source files scanned: ${sourceFiles.length}`)
  console.log(`Unique t() keys used in code: ${usedKeys.size}`)
  console.log(`Keys in ${DEFAULT_LOCALE}.json: ${defaultKeys.size}\n`)

  // Keys used in code but missing from default locale
  const missingFromDefault = [...usedKeys].filter((k) => !defaultKeys.has(k))
  if (missingFromDefault.length) {
    hasIssues = true
    console.log(`\n⚠ Keys used in code but MISSING from ${DEFAULT_LOCALE}.json:`)
    for (const k of missingFromDefault) {
      console.log(`   - ${k}`)
    }
  }

  // For each locale, report missing keys relative to default
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue
    const messages = flattenKeys(loadMessageFile(locale))
    const localeKeys = new Set(Object.keys(messages))
    const missing = [...defaultKeys].filter((k) => !localeKeys.has(k))
    const extra = [...localeKeys].filter((k) => !defaultKeys.has(k))

    if (missing.length || extra.length) {
      hasIssues = true
    }

    console.log(`\n ${locale}:`)
    console.log(`   keys present: ${localeKeys.size}`)
    if (missing.length) {
      console.log(`   ⚠ missing ${missing.length} key(s) vs ${DEFAULT_LOCALE}:`)
      for (const k of missing) {
        console.log(`      - ${k}`)
      }
    }
    if (extra.length) {
      console.log(`   ℹ extra ${extra.length} key(s) not in ${DEFAULT_LOCALE}:`)
      for (const k of extra) {
        console.log(`      - ${k}`)
      }
    }
    if (!missing.length && !extra.length) {
      console.log(`   ✓ in sync with ${DEFAULT_LOCALE}`)
    }
  }

  console.log(`\n${"=".repeat(60)}\n`)

  if (validate && hasIssues) {
    process.exit(1)
  }
}

main()
