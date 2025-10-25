import { useRef, useState } from 'react'
import type { RefObject } from 'react'

export type CustomRef<T> = RefObject<T> & { setCurrent: (value: T) => void }
export function useCustomRef<T>(): CustomRef<T> {
  const ref = useRef<T>(null) as CustomRef<T>;
  const [value, setValue] = useState(undefined as unknown as T);
  (ref as any).current = value;
  ref.setCurrent = setValue;
  return ref;
}
