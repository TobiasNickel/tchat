import { createRoot } from 'react-dom/client'

const createElement = document.createElement('div')
const createSVGElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

export const dom = {
  query: (selector: string) => Array.from(document.querySelectorAll(selector)),
  // create element from html string.
  // need to have a single root element.
  create: (html: string) => {
    createElement.innerHTML = html
    const element = createElement.children[0]
    createElement.innerHTML = ''
    return element as HTMLElement
  },
  createSvg: (html: string) => {
    createSVGElement.innerHTML = html
    const element = createSVGElement.children[0]
    createSVGElement.innerHTML = ''
    return element as HTMLElement
  },
  idElements: (element: HTMLElement) => {
    const map = {} as { [key: string]: HTMLElement }
    element.querySelectorAll('[id]').forEach(el => {
      map[el.id] = el as HTMLElement
    })
    return map
  },
  /**
   * this is meant to get the svg from some icon elements
   * @param element
   * @returns
   */
  reactElementToHtml: (element: JSX.Element, transform?: (html: string) => string) => {
    const tmpReactElementContainer = document.createElement('div')
    const root = createRoot(tmpReactElementContainer)
    root.render(element)
    const srcHolder = { src: '' }
    function setSrc() {
      setTimeout(() => {
        const html = tmpReactElementContainer.innerHTML

        srcHolder.src = transform ? transform(html) : html
        if (!srcHolder.src) {
          setSrc()
        }
      }, 50)
    }
    setSrc()
    return srcHolder
  },


  /**
   * recursive function to find the dataset attribute in the element and its parents
   * @param element
   * @param datasetName
   */
  matchParent(_element: EventTarget | HTMLElement | null, datasetName: string): string | undefined {
    if (!_element) return;
    const element = _element as HTMLElement;
    if (element.dataset && datasetName in element.dataset) {
      return element.dataset[datasetName];
    }
    if (element.tagName === 'BODY') {
      return;
    }
    if (element.parentNode) {
      return dom.matchParent(element.parentNode as HTMLElement, datasetName);
    }
  }

}

export type TagElement = HTMLElement | SVGElement

export abstract class View {
  protected readonly tagName: string = 'div'
  $el: HTMLElement
  constructor(className: string) {
    this.$el = document.createElement(this.tagName)
    this.$el.className = className
    //this.$el.view = this
  }
  query(selector: string) {
    return Array.from(this.$el.querySelectorAll(selector))
  }

  appendTo($parent: HTMLElement) {
    $parent.appendChild(this.$el)
  }

  prependTo($parent: HTMLElement) {
    $parent.prepend(this.$el)
  }

  destroy() {
    this.$el.remove()
  }
}

export function escapeHtml(unsafe: string) {
  return unsafe.replace(/[&<"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m] || ''))
}
