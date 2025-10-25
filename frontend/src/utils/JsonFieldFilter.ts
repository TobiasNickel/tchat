import { parse } from 'querystring'
import { deepToLowerCase } from './deepToLowerCase'
// syntax > output
// example: games[].name = 'game1' > '{"games":[{"name":"game1"}]}'
// example: name='tobias'  '{"name":"tobias"}'
// example: library.games[].name = 'game1' > '{"library":{"games":[{"name":"game1"}]}}'
// example: name='tobias' & age=30 > '{"name":"tobias","age":30}'
// example: name='tobias' & name='michael' > '[{"name":"tobias"},{"name":"michael"}]'
// example: name='tobias' & name='michael' & age=30 > '[{"name":"tobias","age":30},{"name":"michael","age":30}]'

export function searchStringToPostgresJSONFieldQuery(search: string) {
  const result = [{}] as any[]
  const normalizedQueryString = search
    .split(/[\s]/).filter(_ => _).join(' ')
    .split('& ').join('&').split(' &').join('&')
    .split('= ').join('=').split(' =').join('=')
  const query = deepToLowerCase(
    parse(normalizedQueryString, '&', '=', {
      decodeURIComponent(str) {
        return JSON.parse(str)
      }
    })
  )
  for (const key in query) {
    const value = query[key]
    if (Array.isArray(value)) {
      const resultLength = result.length
      value.forEach((v, i) => {
        if (i === 0) {
          result.forEach((r, i) => {
            result[i] = { ...r, [key]: v }
          })
        } else {
          for (let j = 0; j < resultLength; j++) {
            result.push({ ...result[j], [key]: v })
          }
        }
      })
    } else {
      result.forEach((r, i) => {
        result[i] = { ...r, [key]: value }
      })
    }
  }
  return result.map(toPostgresJSONSearchObject)
}

function toPostgresJSONSearchObject(obj: any) {
  const result = {} as any
  Object.keys(obj).forEach(key => {
    const parts = key.split('.').map(s => s.trim())
    const lastPart = parts.pop() ?? ''
    let current = result
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (part.endsWith('[]')) {
        const arr = [] as any[]
        arr.push(current[part.replace('[]', '')] || {})
        current[part.replace('[]', '')] = arr
        current = arr[0]
      } else {
        current[part] = current[part] || {}
        current = current[part]
      }
    }
    current[lastPart] = obj[key]
  })

  return result
}

// function parseSyntax(search: string) {
//   console.log('===>', search)
//   const result = {} as any
//   const stack = [result]
//   const parts = search.split(/(&|\|)/)
//   for (const part of parts) {
//     if (part === '(') {
//       stack.push({})
//     } else if (part === ')') {
//       const obj = stack.pop()
//       stack[stack.length - 1].push(obj)
//     } else if (part === '&') {
//       if (stack[stack.length - 1].operator === '|') {
//         throw new Error('Cannot mix & and | operators')
//       }
//       stack[stack.length - 1].___operator = '&'
//     } else if (part === '|') {
//       if (stack[stack.length - 1].operator === '&') {
//         throw new Error('Cannot mix & and | operators')
//       }
//       stack[stack.length - 1].___operator = '|'
//     } else {
//       const [key, value] = part.split('=')
//       stack[stack.length - 1][key.trim()] = value.trim()
//     }
//   }
//   return result
// }

// console.log(JSON.stringify(searchStringToPostgresJSONFieldQuery('name="tobias" & name="michael"')))
// console.log(JSON.stringify(searchStringToPostgresJSONFieldQuery('name="tobias" & age=30')))
// console.log(JSON.stringify(searchStringToPostgresJSONFieldQuery('name="tobias"')))
// console.log(JSON.stringify(searchStringToPostgresJSONFieldQuery('library.games[].name = "game1"')))
// console.log(JSON.stringify(searchStringToPostgresJSONFieldQuery('games[].name = "game1"')))
// console.log(JSON.stringify(searchStringToPostgresJSONFieldQuery('name="tobias" & age=30')))
// console.log(JSON.stringify(searchStringToPostgresJSONFieldQuery('name="tobias" & name="michael" & age=30')))
