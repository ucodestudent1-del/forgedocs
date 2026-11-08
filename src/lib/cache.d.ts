export function getRedisClient(): any
export function cacheGet<T>(key: string): Promise<T | null>
export function cacheSet(key: string, value: any, ttlSeconds?: number): Promise<void>
export function cacheDel(key: string): Promise<void>