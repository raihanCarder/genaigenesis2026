export type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export function getCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string) {
  const record = cache.get(key);
  if (!record) {
    return null;
  }

  if (Date.now() > record.expiresAt) {
    cache.delete(key);
    return null;
  }

  return record.value;
}

export function setCachedValue<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number
) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });

  return value;
}
