export class ClassUtils {
  /**
   * Toggles CSS classes on multiple HTML elements
   * @param action - true to add classes, false to remove them
   * @param classMap - object with HTML elements as keys and arrays of class names as values
   */
  static toggleClasses(action: boolean, classMap: { [key: string]: { element: HTMLElement, classes: string[] } }): void {
    Object.values(classMap).forEach(({ element, classes }) => {
      if (element && classes) {
        classes.forEach(className => {
          if (action) {
            element.classList.add(className);
          } else {
            element.classList.remove(className);
          }
        });
      }
    });
  }

  /**
   * Applies styles to an HTML element
   * @param element - The target HTML element
   * @param styles - Object containing style properties and values
   * @returns The modified HTML element
   */
  static applyStyles(element: HTMLElement | SVGElement, styles: Partial<CSSStyleDeclaration>): HTMLElement | SVGElement {
    if (element && styles) {
      Object.entries(styles).forEach(([property, value]) => {
        if (value !== undefined) {
          element.style[property as any] = String(value);
        }
      });
    }
    return element;
  }

  /**
   * Adds CSS classes to an HTML element
   * @param element - The target HTML element
   * @param classes - Array of class names to add
   * @returns The modified HTML element
   */
  static addClasses(element: HTMLElement, classes: string[]): HTMLElement {
    if (element && Array.isArray(classes)) {
      classes.forEach(className => {
        if (className) {
          element.classList.add(className);
        }
      });
    }
    return element;
  }


  /**
   * Adds CSS classes to an HTML element from a space-separated string
   * @param element - The target HTML element
   * @param classes - Space-separated string of class names to add
   * @returns The modified HTML element
   */
  static addClassesFromString(element: HTMLElement | SVGElement, classes: string): HTMLElement | SVGElement {
    if (element && classes) {
      const classArray = classes.trim().split(/\s+/).filter(className => className);
      classArray.forEach(className => {
        if (!element.classList.contains(className)) {
          element.classList.add(className);
        }
      });
    }
    return element;
  }
}



