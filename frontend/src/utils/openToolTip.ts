import { dom } from './dom'
import type { TagElement } from './dom'

type ToolTipOptions = ({text: string} | {html: string}) & {
  duration: number
  leaveArea?: TagElement
  position?: 'above' | 'below'
}

let lastToolLip = null as HTMLElement | null
export function openToolTip(e: MouseEvent | TagElement, options: ToolTipOptions) {
  const { duration, leaveArea, position = 'above'} = options

  if(lastToolLip){
    lastToolLip.remove()
  }
  const $tooltip = dom.create(`<div class="absolute bg-white text-black p-2  px-4 rounded shadow-md z-50 border border-gray-200"></div>`)
  if ('html' in options) {
    $tooltip.innerHTML = options.html
  } else {
    $tooltip.innerText = options.text
  }

  document.body.appendChild($tooltip)

  const close = () => {
    $tooltip.remove()
    lastToolLip = null
    clearTimeout(timeout)
    if (leaveArea) {
      leaveArea.removeEventListener('mouseleave', close)
    }
  }


  const point = getPositionPoint(e, position || 'above')
  const rect = $tooltip.getBoundingClientRect()
  $tooltip.style.left = point.x - (rect.width / 2) + 'px'
  $tooltip.style.top = position==='above' ? (point.y - 6 - rect.height) + 'px' : (point.y + 4) + 'px'

  const timeout = setTimeout(close, duration)
  lastToolLip = $tooltip

  setTimeout(()=>{
    $tooltip.addEventListener('mouseleave', close)
    if (leaveArea) {
      leaveArea.addEventListener('mouseleave', close)
    }
  },5)
}

function getPositionPoint(e: MouseEvent | TagElement, position: 'above' | 'below'){
  if(e instanceof HTMLElement || e instanceof SVGElement) {
    const rect = e.getBoundingClientRect()
    if(position === 'above'){
      return {
        x: rect.left + rect.width/2,
        y: rect.top
      }
    } else {
      return {
        x: rect.left + rect.width/2,
        y: rect.bottom
      }
    }
  }
  return {
    x: e.clientX,
    y: e.clientY
  }
}
