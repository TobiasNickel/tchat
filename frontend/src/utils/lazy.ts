import { useEffect, useState } from "react"

/**
 * This is a type data that should be loaded once it get needed.
 */
export type LazyLoaded<T> = T | Promise<T> | Error | undefined
export function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return (value as any)?.then instanceof Function
}
export function isError<T>(value: T | Error): value is Error {
  return (value as any)?.message instanceof String || value instanceof Error
}

export function getLazyLoadedData<T>(value: LazyLoaded<T>): T | undefined {
  if (isPromise(value)) {
    return
  }
  if (isError(value)) {
    return
  }
  return value
}

export function isLazyLoadedDataLoaded<T>(value: LazyLoaded<T>): boolean {
  return !isPromise(value) && !isError(value)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function resolveLazyLoadedData<T>(method: () => LazyLoaded<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    (async () => {
      let value: T;
      let isLoaded = false
      do {
        await sleep(500)

        const lazy = method()
        value = getLazyLoadedData(lazy)!
        isLoaded = isLazyLoadedDataLoaded(lazy)
      } while (!isLoaded)

      if (isError(value)) {
        reject(value)
      } else {
        resolve(value)
      }
    })()
  })
}

export function loadLazyLoadedData({ parent, propName, load, onDone }: { parent: any, propName: string, load: () => Promise<any>, onDone?: (result: any) => void }) {
  const value = parent[propName]
  if (isPromise(value)) {
    return
  }
  if (isError(value)) {
    return
  }
  if (value !== undefined) {
    return
  }
  parent[propName] = load().then((result) => {
    parent[propName] = result
    onDone && onDone(result)
    return result
  }).catch((err) => {
    parent[propName] = err
    onDone && onDone(err)
    throw err
  })
}

export function useLazyLoader<T>({
  parent,
  propName,
  loader }: {
    parent: any,
    propName: string,
    loader: () => Promise<T>
  }): LazyLoaded<T> {
  const [, setValue] = useState(parent[propName])
  useEffect(() => {
    const promise = loader().then((result) => {
      parent[propName] = result
      setValue(result)
    })
    parent[propName] = promise
    setValue(promise)
  }, [parent])
  return parent[propName]
}
