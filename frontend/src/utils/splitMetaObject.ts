import { assert } from './assert'

export function splitMetaObject(obj: Record<string, any>): [Record<string, any>, Record<string, any>] {
  assert(typeof obj === 'object', 'metaObject must be an object', 400)
  const meta: Record<string, any> = {}
  const rest: Record<string, any> = {}
  for (const key in obj) {
    if (key.startsWith('_')) {
      meta[key.substring(1)] = obj[key.substring(1)]
    } else {
      rest[key] = obj[key]
    }
  }

  return [rest, meta]
}
