/**
 * this function takes an object and returns a new object with all string values in lower case
 *
 * In postgres when query json fields, they are case sensitive. by storing a copy with all keys in lower case, we can make the search case insensitive
 * only the lowercase field need to be indexed.
 *
 * @param obj
 * @returns
 */
export function deepToLowerCase(obj: any): any {
  if (typeof obj === 'string') {
    return obj.toLowerCase().trim()
  }
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(deepToLowerCase)
    }
    return Object.keys(obj).reduce<any>((acc, key) => {
      acc[key] = deepToLowerCase(obj[key])
      return acc
    }, {})
  }
  return obj
}
