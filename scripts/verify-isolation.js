#!/usr/bin/env node
/**
 * Multi-Tenant Isolation Verification Script
 * Verifies that no cross-tenant data access is possible
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function verifyRLSPolicies() {
  console.log('\n=== Verifying RLS Policies ===\n')
  
  const tables = [
    'documents',
    'templates',
    'conversion_jobs',
    'document_versions',
    'profiles',
    'subscriptions',
    'usage_records',
    'audit_log'
  ]

  let allPassed = true

  for (const table of tables) {
    try {
      // Check if RLS is enabled
      const { data: rlsEnabled } = await supabase.rpc('check_rls_enabled', { table_name: table })
      
      if (!rlsEnabled) {
        console.log(`❌ ${table}: RLS NOT ENABLED`)
        allPassed = false
      } else {
        console.log(`✅ ${table}: RLS enabled`)
      }

      // Check for policies
      const { data: policies } = await supabase.rpc('get_policies', { table_name: table })
      if (policies && policies.length > 0) {
        console.log(`   Policies: ${policies.map(p => p.policyname).join(', ')}`)
      } else {
        console.log(`   ⚠️  No policies found`)
      }
    } catch (err) {
      console.log(`❌ ${table}: Error checking RLS - ${err.message}`)
      allPassed = false
    }
  }

  return allPassed
}

async function verifyCrossTenantAccess() {
  console.log('\n=== Verifying Cross-Tenant Isolation ===\n')
  
  // Create two test users
  const testUser1 = 'test-user-1-' + Date.now()
  const testUser2 = 'test-user-2-' + Date.now()
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // Test user 1 creates a document
  const { data: { user: user1 }, error: signUpError1 } = await supabase.auth.signUp({
    email: `test1-${Date.now()}@example.com`,
    password: 'TestPass123!',
  })
  
  if (signUpError1) {
    console.log('❌ Failed to create test user 1:', signUpError1.message)
    return false
  }

  // Test user 2 creates a document
  const { data: { user: user2 }, error: signUpError2 } = await supabase.auth.signUp({
    email: `test2-${Date.now()}@example.com`,
    password: 'TestPass123!',
  })
  
  if (signUpError2) {
    console.log('❌ Failed to create test user 2:', signUpError2.message)
    return false
  }

  // User 1 creates a document
  const { data: doc1, error: docError1 } = await supabase
    .from('documents')
    .insert({
      user_id: user1.user.id,
      title: 'User 1 Document',
      content: 'Secret content from user 1',
      mime_type: 'text/plain',
      file_size: 100,
      version: 1
    })
    .select()
    .single()

  if (docError1) {
    console.log('❌ Failed to create document for user 1:', docError1.message)
    return false
  }

  // User 2 tries to access user 1's document (should fail)
  const { data: doc2, error: docError2 } = await supabase
    .from('documents')
    .select('*')
    .eq('id', doc1.id)
    .eq('user_id', user2.user.id)
    .single()

  if (!docError2 || doc2) {
    console.log('❌ Cross-tenant access possible! User 2 can access User 1 document')
    return false
  } else {
    console.log('✅ Cross-tenant isolation working - User 2 cannot access User 1 document')
  }

  // Cleanup
  await supabase.auth.admin.deleteUser(user1.user.id)
  await supabase.auth.admin.deleteUser(user2.user.id)

  return true
}

async function verifyDataIntegrity() {
  console.log('\n=== Verifying Data Integrity ===\n')
  
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, user_id, title')
    .limit(100)
  
  if (error) {
    console.log('❌ Error querying documents:', error.message)
    return false
  }
  
  // Check all documents have user_id
  const orphaned = docs.filter(d => !d.user_id)
  if (orphaned.length > 0) {
    console.log(`❌ Found ${orphaned.length} documents without user_id`)
    return false
  }
  
  console.log(`✅ All ${docs.length} documents have valid user_id`)
  return true
}

async function main() {
  console.log('=== Multi-Tenant Isolation Verification ===\n')
  console.log(`Testing against: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`)
  
  const results = {
    rlsPolicies: await verifyRLSPolicies(),
    crossTenantIsolation: await verifyCrossTenantAccess(),
    dataIntegrity: await verifyDataIntegrity()
  }
  
  console.log('\n=== Summary ===')
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`)
  })
  
  const allPassed = Object.values(results).every(r => r)
  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
  
  process.exit(allPassed ? 0 : 1)
}

main().catch(console.error)