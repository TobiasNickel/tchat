const alphabet = 'abcdefghijklmnopqrstuvwxyz'
export function alphabeticalEnumeration(n: number): string {
  const result: string[] = []
  while (n >= 0) {
    result.unshift(alphabet[n % 26])
    n = Math.floor(n / 26) - 1
  }
  return result.join('.')
}

export function ignore(...args: any[]) {
  // do nothing
}

export type EmptyObject = Record<string, never>
export type AnyObject = Record<string, any>

/**
 *
 * @param arr
 * @param nestedProperty
 * @param reverseProperty
 */
export function swopNesting(arr: any[], nestedItemProperty: string, reverseListProperty: string, keyProperty: string = 'id') {
  const result: any[] = []
  const resultMap: any = {}
  arr.forEach((item: any) => {
    if (!resultMap[item[nestedItemProperty][keyProperty]]) {
      resultMap[item[nestedItemProperty][keyProperty]] = item[nestedItemProperty]
      if (!Array.isArray(item[nestedItemProperty][reverseListProperty])) {
        item[nestedItemProperty][reverseListProperty] = []
      }
      result.push(item[nestedItemProperty])
    }
    resultMap[item[nestedItemProperty][keyProperty]][reverseListProperty].push(item)
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete item[nestedItemProperty]
  })
  return result
}

export function indexBy<T>(arr: T[], propertyName: keyof T): Record<string, T> {
  const result: Record<string, T> = {}
  for (const item of arr) {
    result[item[propertyName] as string] = item
  }
  return result
}

export function indexByComputed<T>(arr: T[], fun: (item: T) => string): Record<string, T> {
  const result: Record<string, T> = {}
  for (const item of arr) {
    const key = fun(item)
    result[key] = item
  }
  return result
}

export function groupBy<T>(arr: T[], propertyName: keyof T): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of arr) {
    const key = item[propertyName]
    if (!result[key as string]) { result[key as string] = [] }
    result[key as string].push(item)
  }
  return result
}

export function groupByComputed<T>(arr: T[], fun: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of arr) {
    const key = fun(item)
    if (!result[key]) { result[key] = [] }
    result[key].push(item)
  }
  return result
}

export function uniqueBy<T>(arr: T[], propertyName: keyof T): T[] {
  const result: T[] = []
  const resultSet = new Set<string>()
  arr.forEach(item => {
    const key = item[propertyName] as string
    if (!resultSet.has(key)) {
      resultSet.add(key)
      result.push(item)
    }
  })
  return result
}

export function sortByDate<T>(array: T[], dateKey: keyof T, order = 'desc'): T[] {
  return [...array].sort((a, b) => {
    const aDate = a[dateKey] instanceof Date ? a[dateKey] as Date : new Date(0)
    const bDate = b[dateKey] instanceof Date ? b[dateKey] as Date : new Date(0)

    if (order === 'asc') return aDate.getTime() - bDate.getTime()
    return bDate.getTime() - aDate.getTime()
  })
}
export function getDiffObject(previous: any, current: any) {
  const diff = {} as any
  for (const key of Object.keys(current)) {
    if (previous[key] !== current[key]) {
      diff[key] = current[key]
    }
  }
  return diff
}
export function omit(obj: any, keys: string[]) {
  const result = {} as any
  for (const key of Object.keys(obj)) {
    if (!keys.includes(key)) {
      result[key] = obj[key]
    }
  }
  return result
}
export function pick(obj: any, keys: string[]) {
  const result = {} as any
  for (const key of keys) {
    if (key in obj && obj[key] !== undefined) {
      result[key] = obj[key]
    }
  }
  return result
}
export function isEmptyObject(obj: any) {
  return Object.keys(obj).length === 0
}

/**
 * @deprecated use lib/postgresDao assignManyToOne instead
 */
export function listAssign<T, T2>(destItems: T[], assigneeItems: T2[], destProperty: string, foreignKeyProperty: keyof T2 = 'id' as keyof T2, destIDKey: keyof T = 'id' as keyof T) {
  const assigneesByDestId = groupBy(assigneeItems, foreignKeyProperty)
  // assigneeItems.forEach((item: any) => { item[destProperty] = [] })
  destItems.forEach((destItem: any) => { destItem[destProperty] = assigneesByDestId[destItem[destIDKey]] || [] })
  return destItems
}

/**
 * @deprecated use lib/postgresDao assignOneToMany instead
 */
export function listAssignSingle<T, T2>(destItems: T[], assigneeItems: T2[], destProperty: string, foreignKeyProperty: keyof T2 = 'id' as keyof T2, destIDKey: keyof T = 'id' as keyof T) {
  const assigneesByDestId = indexBy(assigneeItems, foreignKeyProperty)
  // assigneeItems.forEach((item: any) => { item[destProperty] = [] })
  destItems.forEach((destItem: any) => { destItem[destProperty] = assigneesByDestId[destItem[destIDKey]] })
  return destItems
}

export function createUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export type KeyofDeep<T> = T extends object ? {
  [K in keyof T]: K | KeyofDeep<T[K]>
}[keyof T] : never

export function keysDeep<T extends object>(obj: T): Array<KeyofDeep<T>> {
  const keys: Array<KeyofDeep<T>> = []
  for (const key in obj) {
    if (!Array.isArray(obj)) {
      keys.push(key as KeyofDeep<T>)
    }
    const nextObj = obj[key] as any
    if (typeof nextObj === 'object') {
      keys.push(...keysDeep(nextObj as T))
    }
  }

  return keys
}

export async function sleep(ms: number) {
  return await new Promise(resolve => setTimeout(resolve, ms))
}

export function toGridPos(index: number, cols: number): { column: number, row: number } {
  return {
    column: index % cols,
    row: Math.floor(index / cols)
  }
}

export function notUndefinedType<T>(obj: T | undefined): T {
  return obj as T
}

export function deferredPromise<T>(): {promise: Promise<T>, resolve: (a:T)=>any, reject: (e: any)=>any}{
  const deferred = {} as any
  deferred.promise = new Promise((_resolve,_reject)=>{
    deferred.resolve = _resolve
    deferred.reject = _reject
  })
  return deferred
}