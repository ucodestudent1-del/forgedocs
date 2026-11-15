-- up ---
-- Document that profiles.mfa_secret is now encrypted at rest (AES-256-GCM).
-- Existing plaintext values are re-encrypted lazily on first successful MFA verify.
COMMENT ON COLUMN profiles.mfa_secret IS 'AES-256-GCM encrypted TOTP secret (iv:authTag:ciphertext hex). Legacy plaintext values are re-encrypted lazily on read.';

-- down ---
-- No structural change; encryption key rotation is handled via MFA_SECRET_ENCRYPTION_KEY.
COMMENT ON COLUMN profiles.mfa_secret IS NULL;
