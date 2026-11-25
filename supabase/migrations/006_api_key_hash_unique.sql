--- up ---
-- Enforce uniqueness on api_keys.key_hash so lookups are O(1) and prevent
-- duplicate key hashes from enabling prefix-enumeration brute-force attacks.
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash_unique ON api_keys(key_hash);

--- down ---
DROP INDEX IF EXISTS idx_api_keys_hash_unique;
