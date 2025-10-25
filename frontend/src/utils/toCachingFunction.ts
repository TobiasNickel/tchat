export function toCachingFunction<T>(fn: (argKey: string) => Promise<T>, cacheDuration: number = 1000 * 60) {
  const cache = new Map<string, Promise<T>>();
  return async (key: string) => {
    if (!cache.has(key) && cacheDuration > 0) {
      const fetchPromise = fn(key);
      cache.set(key, fetchPromise);
      setTimeout(() => cache.delete(key), cacheDuration);
    }
    return await cache.get(key)!;
  }
}
export function toCachingNoArgFunction<T>(fn: () => Promise<T>, cacheDuration: number = 1000 * 60) {
  let cache = undefined as Promise<T> | undefined;
  return async () => {
    if (!cache && cacheDuration > 0) {
      const fetchPromise = fn();
      cache = fetchPromise;
      setTimeout(() => cache = undefined, cacheDuration);
    }
    return await cache!;
  }
}
