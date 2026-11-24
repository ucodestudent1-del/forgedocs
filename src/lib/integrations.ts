import { createHmac, timingSafeEqual, randomBytes } from "crypto"
import { getRouteClient } from "@/lib/supabase"
import { encryptDocument, decryptDocument } from "@/lib/encryption"

export interface IntegrationDefinition {
  id: string
  name: string
  description: string
  auth_type: "oauth2" | "api_key" | "none"
  oauth?: {
    authorization_url: string
    token_url: string
    scope: string
    client_id: string
  }
  capabilities: string[] // e.g. ["documents:read", "documents:write"]
}

/**
 * Built-in integration catalog.
 */
export const INTEGRATION_CATALOG: IntegrationDefinition[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Billing and payment integration",
    auth_type: "oauth2",
    oauth: {
      authorization_url: "https://connect.stripe.com/oauth/authorize",
      token_url: "https://connect.stripe.com/oauth/token",
      scope: "read_write",
      client_id: process.env.STRIPE_CONNECT_CLIENT_ID ?? "",
    },
    capabilities: ["billing:read", "billing:write"],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Post document notifications to Slack",
    auth_type: "oauth2",
    oauth: {
      authorization_url: "https://slack.com/oauth/v2/authorize",
      token_url: "https://slack.com/api/oauth.v2.access",
      scope: "chat:write,channels:read",
      client_id: process.env.SLACK_CLIENT_ID ?? "",
    },
    capabilities: ["documents:read", "documents:write"],
  },
  {
    id: "notion",
    name: "Notion",
    description: "Sync documents to Notion",
    auth_type: "oauth2",
    oauth: {
      authorization_url: "https://api.notion.com/v1/oauth/authorize",
      token_url: "https://api.notion.com/v1/oauth/token",
      scope: "read",
      client_id: process.env.NOTION_CLIENT_ID ?? "",
    },
    capabilities: ["documents:read"],
  },
  {
    id: "google_drive",
    name: "Google Drive",
    description: "Export documents to Google Drive",
    auth_type: "oauth2",
    oauth: {
      authorization_url: "https://accounts.google.com/o/oauth2/v2/auth",
      token_url: "https://oauth2.googleapis.com/token",
      scope: "https://www.googleapis.com/auth/drive.file",
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    },
    capabilities: ["documents:write"],
  },
]

export function getIntegration(id: string): IntegrationDefinition | undefined {
  return INTEGRATION_CATALOG.find((i) => i.id === id)
}

/**
 * Encrypt an OAuth token for storage.
 */
export function encryptToken(token: string): string {
  return encryptDocument(token)
}

/**
 * Decrypt a stored OAuth token.
 */
export function decryptToken(encrypted: string): string {
  return decryptDocument(encrypted)
}

/**
 * Generate a code verifier and challenge for OAuth2 PKCE.
 */
export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString("base64url")
  const codeChallenge = createHmac("sha256", codeVerifier).digest("base64url")
  return { codeVerifier, codeChallenge }
}

/**
 * Constant-time comparison.
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
