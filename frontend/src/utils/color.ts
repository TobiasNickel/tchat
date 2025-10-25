const darkenColorChannel = (c: number, percent: number) => c - (c * percent / 100)
// const lightenColorChannel = (c: number, percent: number) => c + ((255-c) * percent / 100)
const lightenColorChannel = (c: number, percent: number) =>
  Math.round(c + ((255 - c) * percent / 100))

function getColorChannels(color: string) {
  if (color.startsWith('#')) color = color.slice(1)
  const match = color.match(/\w\w/g)
  if (!match) throw new Error('Invalid color format')
  return match.map((x) => parseInt(x, 16))
}

export const colorUtils = {
  brightEnough: (color: string, threshold = 128) => {
    const [r, g, b] = getColorChannels(color)
    return r * 0.299 + g * 0.587 + b * 0.114 > threshold
  },
  darkEnough: (color: string, threshold = 128) => {
    return !colorUtils.brightEnough(color, threshold)
  },
  getContrastColor: (color: string) => {
    return colorUtils.darkEnough(color) ? '#ffffff' : '#000000'
  },
  darkenBy: (color: string, percent: number) => {
    const [r, g, b] = getColorChannels(color)
    return `#${darkenColorChannel(r, percent).toString(16).padStart(2, '0')}${darkenColorChannel(g, percent).toString(16).padStart(2, '0')}${darkenColorChannel(b, percent).toString(16).padStart(2, '0')}`
  },
  lightenBy: (color: string, percent: number) => {
    const [r, g, b] = getColorChannels(color)
    return `#${lightenColorChannel(r, percent).toString(16).padStart(2, '0')}${lightenColorChannel(g, percent).toString(16).padStart(2, '0')}${lightenColorChannel(b, percent).toString(16).padStart(2, '0')}`
  },
  colorSaturation: (color: string) => {
    const [r, g, b] = getColorChannels(color)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    const d = max - min
    return d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  },
  colorChannelDifference: (color: string) => {
    const [r, g, b] = getColorChannels(color)
    return Math.max(r, g, b) - Math.min(r, g, b)
  },
  generateGoodRandomColor: () => {
    let color = ''
    do {
      color = '#' + (Math.random() * 0xFFFFFF << 0).toString(16)
    } while (colorUtils.colorChannelDifference(color) < 150 || color.length < 7)
    return color
  }
}
