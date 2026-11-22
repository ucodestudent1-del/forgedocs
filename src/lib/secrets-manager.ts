import logger from "@/lib/logger"

type SecretProvider = "aws" | "doppler" | "vault" | "env"

interface SecretsManagerConfig {
  provider: SecretProvider
  region?: string
  secretName?: string
  dopplerToken?: string
  vaultToken?: string
  vaultUrl?: string
  vaultMountPath?: string
  cacheTtlMs?: number
}

interface CachedSecret {
  value: string
  expiry: number
}

export class SecretsManager {
  private config: Required<SecretsManagerConfig>
  private cache: Map<string, CachedSecret> = new Map()

  constructor(config: SecretsManagerConfig) {
    this.config = {
      provider: config.provider,
      region: config.region ?? "us-east-1",
      secretName: config.secretName ?? "",
      dopplerToken: config.dopplerToken ?? "",
      vaultToken: config.vaultToken ?? "",
      vaultUrl: config.vaultUrl ?? "",
      vaultMountPath: config.vaultMountPath ?? "secret",
      cacheTtlMs: config.cacheTtlMs ?? 300000, // 5 minutes
    }
  }

  /**
   * Get a secret value. Falls back to environment variable if external provider
   * is unavailable or not configured.
   */
  async getSecret(key: string): Promise<string | null> {
    // Check cache first
    const cached = this.cache.get(key)
    if (cached && cached.expiry > Date.now()) {
      return cached.value
    }

    let value: string | null = null

    switch (this.config.provider) {
      case "aws":
        value = await this.getSecretFromAws(key)
        break
      case "doppler":
        value = await this.getSecretFromDoppler(key)
        break
      case "vault":
        value = await this.getSecretFromVault(key)
        break
      case "env":
      default:
        value = process.env[key] ?? null
        break
    }

    // Fallback to environment variable if external provider returned nothing
    if (!value) {
      value = process.env[key] ?? null
    }

    if (value) {
      this.cache.set(key, { value, expiry: Date.now() + this.config.cacheTtlMs })
    }

    return value
  }

  private async getSecretFromAws(key: string): Promise<string | null> {
    if (!this.config.secretName) {
      logger.warn("AWS Secrets Manager: secretName not configured")
      return null
    }

    try {
      // Lazy load AWS SDK to avoid hard dependency when not using AWS provider
      const { SecretsManagerClient, GetSecretValueCommand }: any = await (
        // @ts-expect-error - AWS SDK is optional, may not be installed
        import("@aws-sdk/client-secrets-manager")
      )

      const client = new SecretsManagerClient({ region: this.config.region })
      const command = new GetSecretValueCommand({ SecretId: this.config.secretName })
      const response = await client.send(command)

      const secretString = response.SecretString
      if (!secretString) return null

      const secret = JSON.parse(secretString)
      return secret[key] ?? null
    } catch (err) {
      logger.warn("AWS Secrets Manager lookup failed", {
        error: err instanceof Error ? err.message : String(err),
        key,
      })
      return null
    }
  }

  private async getSecretFromDoppler(key: string): Promise<string | null> {
    if (!this.config.dopplerToken) {
      logger.warn("Doppler: token not configured")
      return null
    }

    try {
      const response = await fetch(
        `https://api.doppler.com/v3/configs/config/secrets/${key}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.dopplerToken}`,
          },
        }
      )

      if (!response.ok) {
        logger.warn("Doppler: secret not found", { key, status: response.status })
        return null
      }

      const data = await response.json()
      return data?.value ?? null
    } catch (err) {
      logger.warn("Doppler lookup failed", {
        error: err instanceof Error ? err.message : String(err),
        key,
      })
      return null
    }
  }

  private async getSecretFromVault(key: string): Promise<string | null> {
    if (!this.config.vaultUrl || !this.config.vaultToken) {
      logger.warn("Vault: URL or token not configured")
      return null
    }

    try {
      const response = await fetch(
        `${this.config.vaultUrl}/v1/${this.config.vaultMountPath}/data/${key}`,
        {
          headers: {
            "X-Vault-Token": this.config.vaultToken,
          },
        }
      )

      if (!response.ok) {
        logger.warn("Vault: secret not found", { key, status: response.status })
        return null
      }

      const data = await response.json()
      return data?.data?.data?.[key] ?? null
    } catch (err) {
      logger.warn("Vault lookup failed", {
        error: err instanceof Error ? err.message : String(err),
        key,
      })
      return null
    }
  }

  /**
   * Clear the cache. Useful after secret rotation.
   */
  clearCache(): void {
    this.cache.clear()
  }
}

/**
 * Singleton instance configured from environment variables.
 * Defaults to "env" provider (reads from process.env) when no external
 * provider is configured.
 */
function buildConfigFromEnv(): SecretsManagerConfig {
  const provider = (process.env.SECRETS_MANAGER_PROVIDER as SecretProvider) ?? "env"

  return {
    provider,
    region: process.env.AWS_REGION ?? "us-east-1",
    secretName: process.env.AWS_SECRETS_MANAGER_SECRET_NAME ?? "",
    dopplerToken: process.env.DOPPLER_TOKEN ?? "",
    vaultToken: process.env.VAULT_TOKEN ?? "",
    vaultUrl: process.env.VAULT_URL ?? "",
    vaultMountPath: process.env.VAULT_MOUNT_PATH ?? "secret",
    cacheTtlMs: parseInt(process.env.SECRETS_CACHE_TTL_MS ?? "300000", 10),
  }
}

export const secretsManager = new SecretsManager(buildConfigFromEnv())

/**
 * Get a secret from the configured provider, falling back to env vars.
 * Use this instead of process.env directly for secrets that may be
 * managed externally (e.g., AWS Secrets Manager, Doppler, Vault).
 */
export async function getSecret(key: string): Promise<string | null> {
  return secretsManager.getSecret(key)
}
