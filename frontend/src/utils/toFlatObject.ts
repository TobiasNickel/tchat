
export function toFlatObject(obj: any, prefix= '', result = {} as any) {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      toFlatObject(item, `${prefix}${prefix ? '.' : ''}${index}`, result)
    })
  } else if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(key => {
      toFlatObject(obj[key], `${prefix}${prefix ? '.' : ''}${key}`, result)
    })
  } else {
    result[prefix] = obj
  }
  return result
}

export function fromFlatObject(obj: any) {
  return Object.keys(obj).reduce((acc, key) => {
    const keys = key.split('.')
    let target = acc as any
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]!
      if (i === keys.length - 1) {
        target[k] = obj[key]
      } else if (!target[k]) {
        target[k] = isNaN(keys[i + 1] as any) ? {} as any : []
      }
      target = target[k]
    }
    return acc
  }, {})
}
