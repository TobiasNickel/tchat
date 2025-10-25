type toBatchingFunctionOptions<T> = {
  /**
   * The property to use to match the results with the input.
   * @default 'id'
   * this is usually the name of the field that was contains the value of the argument of listIndex.
   */
  resultProp?: keyof T
  /**
   * The index of the argument. The first argument is 0.
   * function calles, where the arguments before this index argument are the same, will be batched.
   * The argument at the index of the functions argument list, need to be an array type.
   * If the function is used with arguments behind the index argument, the function will be called directly without batching.
   * So behind the index argument, parameter such as paging or a transaction can be used.
   * @default 0
   */
  listIndex?: number
  /**
   * The delay in ms, to wait for more requests/function calls to come in.
   * @default 0
   */
  delay?: number
}

type Task<T> = { args: any[], deffer: Deferrer<T[]>, context: any, preArgs: any[] }

/**
 * Gives a class method the ability to batch requests.
 */
export function batching<T>(options?: toBatchingFunctionOptions<T>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    descriptor.value = toBatchingFunction(method, options)
  }
}

/**
 * Gives a function the ability to batch requests.
 * @param method
 * @param param1
 * @returns
 */
export function toBatchingFunction<TResult>(method: (...args: any[]) => Promise<TResult[]>, { resultProp = 'id' as keyof TResult, listIndex = 0, delay = 0 }: toBatchingFunctionOptions<TResult> = { resultProp: 'id' as keyof TResult, listIndex: 0, delay: 0 }) {
  const wait = createWaiter(delay)

  const nextTasks = new Map<string, Array<Task<TResult>>>()
  const waitings = new Map<string, any>()
  return async function (..._args: any[]) {
    if (Object.keys(_args).length > (listIndex + 1)) {
      // eslint-disable-next-line
      // @ts-ignore
      return await method.apply(this, [..._args])
    }
    let args = _args[listIndex]

    if (!Array.isArray(args)) args = [args]
    const deffer = getDeffer<TResult[]>()

    const preArgs = getFirstItems(listIndex, _args)
    const hash = JSON.stringify(preArgs)
    if (!nextTasks.has(hash)) {
      nextTasks.set(hash, [] as any)
    }
    nextTasks.get(hash)?.push({
      preArgs,
      args,
      deffer,
      // eslint-disable-next-line
      // @ts-ignore
      context: this
    })
    apply(hash)

    return await deffer
  }

  function apply(hash: string) {
    if (waitings.get(hash) || !nextTasks.has(hash) || !nextTasks.get(hash)?.length) {
      return
    }
    waitings.set(hash, true)
    wait(function () {
      const tasks = nextTasks.get(hash)
      nextTasks.delete(hash)
      const args: any[] = []
      let context: any
      tasks?.forEach(function (task) {
        context = task.context
        task.args.forEach(function (arg: string) {
          if (!args.includes(arg)) {
            args.push(arg)
          }
        })
      })
      const preArgs = tasks?.[0].preArgs ?? []
      method.apply(context, [...preArgs, args]).then(function (results) {
        waitings.delete(hash)
        apply(hash)
        const resultIndex: Record<string, TResult[]> = {}
        results.forEach((r) => {
          const key = r[resultProp] as any
          if (!resultIndex[key]) resultIndex[key] = []
          resultIndex[key].push(r)
        })
        tasks?.forEach(function (task) {
          let result: TResult[] = []
          task.args.forEach(function (arg) {
            const r = resultIndex[arg]
            if (r) {
              result = result.concat(r)
            }
          })
          task.deffer.resolve(clone(result))
        })
        return results
      }).catch(function (err) {
        waitings.delete(hash)
        apply(hash)
        tasks?.forEach(function (task) {
          task.deffer.reject(err)
        })
      })
    })
  }
}

function getFirstItems<T>(num: number, args: T[]) {
  const out = []
  for (let i = 0; i < num; i++) {
    out.push(args[i])
  }
  return out
}

/**
 * This clone function is meaned to be fast.
 * It is faster then the deepClone function from lodash and underscore.
 * Not because I am so much smarter, but because it is more specialized.
 * This clone function is a deepClone function, that does not track
 * circular references, because it is not needed when reading from the database.
 *
 * for this project, it is used to clone typeorm Entities, those will have the
 * same shape, but are not actual of the class of that entity.
 *
 * @param obj the object to clone
 * @returns
 */
export function clone<T>(obj: T): T {
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    return obj.map(clone) as any
  }
  if (obj instanceof Date) {
    const date = new Date()
    date.setTime(obj.getTime())
    return date as any
  }
  if (!obj) return obj
  const result: T = {} as any
  (Object.keys(obj) as Array<keyof T>).forEach((k: keyof T) => {
    result[k] = clone(obj[k])
  })
  return result
}

type Deferrer<T> = Promise<T> & { resolve: (arg: T) => any, reject: (err: Error) => any }
function getDeffer<T>(): Deferrer<T> {
  let res: (arg: T) => any = () => { }
  let rej: (err: Error) => any = () => { }
  const p = new Promise((resolve: any, reject: any) => {
    res = resolve
    rej = reject
  }) as Deferrer<T>
  p.resolve = res
  p.reject = rej
  return p
}

function createWaiter(delay: number) {
  if (!delay) return (cb: () => void) => { process.nextTick(cb) }
  return (cb: () => void) => setTimeout(cb, delay)
}
