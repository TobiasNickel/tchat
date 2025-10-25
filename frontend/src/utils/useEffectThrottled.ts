import { useEffect } from 'react'

export function useEffectThrottled(callback: () => void, delay: number, deps: any[]) {
  useEffect(() => {
    const handler = setTimeout(() => {
      callback()
    }, delay)
    return () => {
      clearTimeout(handler)
    }
  }, deps)
}
