import { getRouteClient } from "@/lib/supabase"
import { createAppError } from "@/lib/api-error"

export type AccountRole = "owner" | "admin" | "member" | "viewer"

const ROLE_HIERARCHY: Record<AccountRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
}

export interface Account {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  owner_id: string
  role: AccountRole
}

export interface AccountMembership {
  account: Account
  role: AccountRole
}

function toAccount(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    status: row.status,
    owner_id: row.owner_id,
    role: row.role,
  }
}

export function hasRole(actual: AccountRole | undefined | null, required: AccountRole): boolean {
  return (ROLE_HIERARCHY[actual as AccountRole] ?? 0) >= (ROLE_HIERARCHY[required] ?? 0)
}

/** Every account the user is a member of, with their role in each. */
export async function getUserAccounts(userId: string): Promise<Account[]> {
  const supabase = await getRouteClient()
  const { data, error } = await (supabase as any)
    .from("account_members")
    .select("role, accounts ( id, name, slug, plan, status, owner_id )")
    .eq("user_id", userId)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return (data || []).map((m: any) => ({
    ...toAccount(m.accounts),
    role: m.role,
  }))
}

/** The user's membership in a specific account, or null. */
export async function getAccountMembership(
  userId: string,
  accountId: string,
): Promise<AccountMembership | null> {
  const supabase = await getRouteClient()
  const { data, error } = await (supabase as any)
    .from("account_members")
    .select("role, accounts ( id, name, slug, plan, status, owner_id )")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .single()

  if (error) {
    return null
  }

  return { account: toAccount(data.accounts), role: data.role }
}

/** IDs of every account the user can access. */
export async function getAccessibleAccountIds(userId: string): Promise<string[]> {
  const accounts = await getUserAccounts(userId)
  return accounts.map((a) => a.id)
}

/**
 * Verify the user is a member of the account (with at least the required role).
 * Throws a 403 AppError if not. Returns the account on success.
 */
export async function requireAccountMembership(
  userId: string,
  accountId: string,
  requiredRole: AccountRole = "member",
): Promise<Account> {
  const membership = await getAccountMembership(userId, accountId)
  if (!membership) {
    throw createAppError("Account not found or you are not a member", 403, "ACCOUNT_NOT_FOUND")
  }
  if (!hasRole(membership.role, requiredRole)) {
    throw createAppError("Insufficient account permissions", 403, "INSUFFICIENT_ROLE")
  }
  return membership.account
}

/**
 * Verify the user can access a resource that either belongs to them personally
 * (resourceAccountId === null) or belongs to an account they are a member of.
 * Callers must still verify user_id ownership for personal resources.
 */
export async function validateResourceAccountAccess(
  resourceAccountId: string | null,
  userId: string,
): Promise<boolean> {
  if (!resourceAccountId) {
    return true
  }
  const accessible = await getAccessibleAccountIds(userId)
  return accessible.includes(resourceAccountId)
}

/**
 * Build a Supabase filter object scoping a query to the user's personal resources
 * (account_id IS NULL) when no account is selected, or to a specific account.
 */
export function accountScope(accountId: string | null) {
  if (accountId) {
    return { account_id: accountId }
  }
  return { account_id: null }
}
