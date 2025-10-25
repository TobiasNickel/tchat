export type TQuery = Record<string, string | number | boolean>

export function toQueryString(query?: TQuery) {
  if(!query) return ''
  if(Object.keys(query).length === 0) return ''
  return '?' + Object.entries(query).filter(([, value])=>value!==undefined&&value!==null).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
}
