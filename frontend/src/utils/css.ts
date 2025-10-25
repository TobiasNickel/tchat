const styles: string[] = [];
const styleElement = document.createElement('style');
document.head.append(styleElement)

export function addStyle(style: string) {
  styles.push(style);
  styleElement.innerHTML = styles.join('\n');
}

/**
 * use this function like a template literal to add css styles to the page
 * usage: css`body { background-color: red; }`
 *
 * I recommend you install the es6-string-css vs-code extension to get css syntax highlighting
 *
 * @param strings
 * @param values
 */
export function css(strings: TemplateStringsArray, ...values: Array<string|number>) {
  addStyle(strings.reduce((acc, str, i) => acc + str + (values[i] || ''), ''))
}
(window as any).css = css;

export function createChangeableStyle() {
  const styleElement = document.createElement('style');
  document.head.append(styleElement);
  const changeableStyle = {
    setStyle: (style: string) => {
      styleElement.innerHTML = style;
    },
    css: (strings: TemplateStringsArray, ...values: Array<string|number>) => {
      changeableStyle.setStyle(strings.reduce((acc, str, i) => acc + str + (values[i] || ''), ''));
    },
    remove() {
      styleElement.remove();
    }
  };
  return changeableStyle;
}
(window as any).createChangeableStyle = createChangeableStyle;
