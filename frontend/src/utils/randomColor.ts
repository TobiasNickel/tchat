const colors = [
  '#B1421C',
  '#1392A8',
  '#4D6E00',
  '#E8741E',
  '#1C7C54',
  '#A6373F',
  '#2E86AB',
  '#F29E4C',
  '#3B3B58',
  '#D7263D',
  '#1B998B'
]

export const randomColor = () => {
  return colors[Math.floor(Math.random() * colors.length)]
}

let colorIndex = 0
export const getNextColor = () => {
  return colors[colorIndex++ % colors.length]
}
