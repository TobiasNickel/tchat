import { useEffect, useState } from 'react'
import { tmitter } from 'tmitter'
import type { ITmitter } from 'tmitter'
import { isEqual } from 'underscore'

/**
 * we use this makeAtom to hold state in the frontend.
 * It is similar to Jotai, but it allowes to change state from outside of the component.
 */

export type TAtom<T> = {
  name?: string
  state: T
  set(state: T, partial?: boolean): void
  set(state: Partial<T>, partial: true): void
  onChange: ITmitter<T>
};

export function makeAtom<T extends NonPrimitive, T2>(initData: T, methods = {} as T2, name?: string): TAtom<T> & T2 {
  let updating: number | undefined = undefined;
  const atom = {
    name,
    state: initData,
    set(state: T, partial = false) {
      if (partial) {
        const current = atom.state as any;
        atom.state = Object.assign({}, current ?? {}, state)
      } else {
        if (isEqual(atom.state, state)) return;
        atom.state = state
      }
      if (updating) return;
      updating = setTimeout(() => {
        updating = undefined;
        atom.onChange.trigger(atom.state)
      }, 10) as any as number;
    },
    onChange: tmitter<T>(),
    ...methods,
  }
  return atom
}

export const makeLocalStorageAtom = <T extends NonPrimitive, T2>(key: string, initData: T, methods = {} as T2) => {
  const atom = makeAtom(initData, methods)
  const data = localStorage.getItem(key)
  if (data) {
    atom.set(JSON.parse(data))
  }

  atom.onChange.on((state) => {
    localStorage
      .setItem(key, JSON.stringify(state))
  })

  window.addEventListener('storage', (event) => {
    if (event.key === key) {
      atom.set(JSON.parse(event.newValue || 'undefined'))
    }
  });

  return atom
}


export const makeSessionStorageAtom = <T extends NonPrimitive, T2>(key: string, initData: T, methods = {} as T2) => {
  const atom = makeAtom(initData, methods, key)
  const data = sessionStorage.getItem(key)
  if (data) {
    const parsedData = JSON.parse(data);
    if (typeof parsedData === 'object') {
      atom.set(JSON.parse(data))
    }
  }

  atom.onChange.on((state) => {
    sessionStorage
      .setItem(key, JSON.stringify(state))
  })

  window.addEventListener('storage', (event) => {
    if (event.key === key) {
      atom.set(JSON.parse(event.newValue || 'undefined'))
    }
  });

  return atom
}


export function useAtom<T>(atom: TAtom<T>) {
  const [state, setState] = useState(atom.state)
  useEffect(() => {
    atom.onChange.on(setState)
    return () => {
      atom.onChange.off(setState)
    }
  })
  return state
}

export function subAtom<T>(atom: TAtom<any>, propName: string): TAtom<T> {
  const theSubAtom = makeAtom((atom.state as any)?.[propName]);
  (theSubAtom as any)._set = theSubAtom.set;
  theSubAtom.set = (state: any, partial: boolean) => {
    if (partial) {
      atom.set({
        ...atom.state,
        [propName]: {
          ...atom.state?.[propName],
          ...state
        }
      }, true);
    } else {
      atom.set({
        ...atom.state,
        [propName]: state
      });
    }
  }
  atom.onChange.on((state) => {
    (theSubAtom as any)._set((state as any)?.[propName]);
  });
  return theSubAtom;
}

// export type NonPrimitive<T> = T extends string | number | boolean ? never : T;
export type NonPrimitive = object | Array<any> | undefined | null;

export function useTmitter(eventEmitter: ITmitter<any>) {
  const [state, setState] = useState(null)
  useEffect(() => {
    eventEmitter.on(setState)
    return () => {
      eventEmitter.off(setState)
    }
  }, [eventEmitter])
  return state
}
