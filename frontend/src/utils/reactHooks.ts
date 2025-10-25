import { useCallback, useEffect, useState } from 'react'

/**
 * This is a custom hook that runs a callback once when the component is mounted.
 * @param callback - a function that will be called once when the component is mounted
 */
export function useInit(callback: () => (()=>void) | void) {
  useEffect(() => {
    return callback();
  }, []);
}

/**
 * This is a custom hook that runs a callback once when the component is unmounted.
 * @param callback - a function that will be called once when the component is unmounted
 */
export function useUnmount(callback: () => void) {
  useEffect(() => {
    return callback;
  }, []);
}

/**
 *
 * @returns a function that rerenders the component
 */
export function useRerender() {
  const [, setCount] = useState(0);
  return useCallback(() => setCount((count) => count + 1), []);
}

export const useLocalStorage = (key: string, initialValue: any) => {
  const [value, setValue] = useState(() => {
    const item = JSON.parse(window.localStorage.getItem(key)??'null');
    return item != undefined ? item : initialValue;
  });

  const setItem = (newValue: any) => {
    setValue(newValue);
    window.localStorage.setItem(key, JSON.stringify(newValue));
  };

  return [value, setItem] as const;
}

export function getLocalStorageValue<T>(key: string, defaultValue: T): T {
  const item = JSON.parse(window.localStorage.getItem(key)??'null');
  return item != undefined ? item : defaultValue;
}

/**
 * This is a custom hook that returns a state and a setState function that also has a current property that holds the current state.
 * This is useful when you need to access the current state in an async function.
 * So you can cache the callback
 * @param initialState
 * @returns
 */
export function useCurrentState<T>(initialState: T) {
  const [state, _setState] = useState(initialState);
  const setState = _setState as React.Dispatch<React.SetStateAction<T>> & { current: T };
  setState.current = state;
  return setState
}

export function useLastActualValue<T>(value: T) {
  const [returnValue, setReturnValue] = useState<T>(value);
  useEffect(() => {
    if(value) {
      setReturnValue(value);
    }
  }, [value]);
  return returnValue;
}
