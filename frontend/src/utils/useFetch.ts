import { useCallback, useEffect, useState } from 'react'
import { useRerender } from './reactHooks'


const cache = new Map<string, Promise<any>>();


export function useFetch<T>(url: string, cacheDuration: number = 1000 * 60, formatData: (data: any) => T = (data) => data as T) {
  const [data, setData] = useState(undefined as T | undefined);
  const [error, setError] = useState(undefined as Error | undefined);
  useEffect(() => {
    setData(undefined);
    setError(undefined);
    if (!cache.has(url) && cacheDuration > 0) {
      const fetchPromise = fetch(url)
        .then((response) => {
          return response.json()
            .then((data) => {
              if (response.ok) {
                return formatData(data);
              } else {
                throw new Error(data);
              }
            })
        });
      cache.set(url, fetchPromise);
      setTimeout(() => cache.delete(url), cacheDuration);
    }
    cache.get(url)!
      .then((cachedData) => {
        setData(cachedData); 3
        setError(undefined);
      })
      .catch((cachedError) => {
        setError(cachedError);
        setData(undefined);
      });
  }, [url, cacheDuration]);
  return [data, error] as const;
}

export function toCachingFunction<T, A extends any[]>(fn: (...args: A) => Promise<T>, cacheDuration: number) {
  const cache = new Map<string, Promise<T>>();
  return async (...args: A) => {
    const key = JSON.stringify(args);
    if (!cache.has(key) || cacheDuration <= 0) {
      cache.set(key, fn(...args));
      setTimeout(() => cache.delete(key), cacheDuration);
    }
    return cache.get(key);
  }
}

export function usePromise<T>(promise: Promise<T>) {
  const [data, setData] = useState(undefined as T | undefined);
  const [error, setError] = useState(undefined as Error | undefined);
  useEffect(() => {
    setData(undefined);
    setError(undefined);
    promise
      .then((data) => {
        setData(data);
        setError(undefined);
      })
      .catch((error) => {
        setError(error);
        setData(undefined);
      });
  }, [promise]);
  return [data, error] as const;
}

export function toCachingHook<T, A extends any[]>(fn: (...args: A) => Promise<T>, cacheDuration: number) {
  const cache = new Map<string, Promise<T>>();
  return (...args: A) => {
    const rerender = useRerender();
    const key = JSON.stringify(args);
    if (!cache.has(key) || cacheDuration <= 0) {
      cache.set(key, fn(...args));
      setTimeout(() => cache.delete(key), cacheDuration);
    }
    return [...usePromise(cache.get(key)!), useCallback(()=>{
      cache.delete(key);
      rerender();
    }, [key])] as const;
  }
}

export function useAsync<T>(fn: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState(undefined as T | undefined);
  const [error, setError] = useState(undefined as Error | undefined);
  useEffect(() => {
    setData(undefined);
    setError(undefined);
    let stopped = false;
    fn()
      .then((data) => {
        if(stopped) return
        setData(data);
        setError(undefined);
      })
      .catch((error) => {
        if(stopped) return
        setError(error);
        setData(undefined);
      });
    return () => {
      stopped = true
    }
  }, dependencies);
  return [data, error] as const;
}
