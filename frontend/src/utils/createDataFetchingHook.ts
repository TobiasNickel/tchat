import { useAtom } from './atom'
import { assert, setByPathShallowCopy, toTrackedPromise } from './utils'
import { getByPath, setByPath } from './utils'
import type { LazyLoaded } from './utils'
import type { TAtom } from './atom'

type TCreateDataFetchingHook<T, T2> = {
  atom: TAtom<T>,
  path: string
  dataLoadingFunction: (state: any) => Promise<T2>,
}

export function createDataFetchingHook<T, T2>({atom, path, dataLoadingFunction }: TCreateDataFetchingHook<T, T2>): () => LazyLoaded<T2>{
  const useDataHook = () => {
    const state = atom.state as any;
    if(state && (!getByPath(state, path) || getByPath(state, path)?.isFulfilled?.() )) {
      setByPath(state, path, toTrackedPromise(dataLoadingFunction(state)
        .then(handleResult(atom.state))
        .catch(handleResult(atom.state))));
    }
    return getByPath(useAtom(atom), path) as LazyLoaded<T2>;
  }

  const handleResult = (promiseState: any)=>(result: any) => {
    const state = atom.state as T & {id: string};
    assert(state, 'state');
    if(promiseState.id !== state.id) { return }
    if(result instanceof Error) { return }
    atom.set(setByPathShallowCopy(state, path, result));
    return result;
  }

  return useDataHook;
}
