const longString = 'hello world'.repeat(1000) + 'keyword' + 'hello world'.repeat(1000)
const longNumberArray = Array.from({ length: 1000 }, (v, k) => k)
const tasks: Record<string, () => any> = {
  regexFind: function() {
    const regex = /keyword/ as any
    return regex.test(longString)
  },
  indexOfFind: function() {
    return longString.indexOf('keyword')
  },
  includesFind: function() {
    return longString.includes('keyword')
  },
  arrayFind: function() {
    return longNumberArray.includes(999)
  },
  arrayFind2: function() {
    return longNumberArray.includes(999)
  }
}

function run(task: () => any, times: number) {
  const start = new Date().getTime()
  for (let i = 0; i < times; i++) {
    task()
  }
  return new Date().getTime() - start
}
// const results: Record<string, number> = {}
// const resultPoints: Record<string, number> = {}

// warm up
// for (const taskName in tasks) {
//   results[taskName] = run(tasks[taskName], 1000000)
//   resultPoints[taskName] = 10000 / results[taskName]
// }

export function runBenchmark() {
  const results: Record<string, number> = {}
  const resultPoints: Record<string, number> = {}

  for (const taskName in tasks) {
    results[taskName] = run(tasks[taskName]!, 1000000)
    resultPoints[taskName] = 10000 / results[taskName]
  }

  // console.log(results);
  // console.log('points');
  // console.log(resultPoints);

  const totalPoints = Object.values(resultPoints).reduce((a, b) => a + b, 0)
  return totalPoints
}
// console.log('total points', runBenchmark())
