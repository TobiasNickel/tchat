import { css } from './css'

(window as any).showModalSpinner = showModalSpinner;

//   //ArrayType<T['fields']>[K] extends { name: infer N, type: infer T, initialValue?: infer I } ? I extends TOrPromise<infer V> ? V : I : never
export function showModalSpinner() {

    const modal = document.createElement('div');
    modal.innerHTML = `
      <div class="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50" style="background-color: rgba(53, 147, 170, 0.7);" id="modalSpinner">
        <div class="lds-dual-ring" style="color: #ffffff;"></div>
      </div>
    `
    document.body.append(modal)

  return {
    $el: modal,
    remove: () => modal.remove()
  }

}

export async function processSpinner(cb: () => Promise<any>, minTime: number = 0) {
  const spinner = showModalSpinner()
  const start = Date.now()
  try {
    await cb()
  } finally {
    const elapsed = Date.now() - start
    if (elapsed < minTime) {
      await new Promise(resolve => setTimeout(resolve, minTime - elapsed))
    }
    spinner.remove()
  }
}

// for the spinner I used this website: https://loading.io/css/
css`
.lds-dual-ring {
  /* change color here */
  color: #1c4c5b
}
.lds-dual-ring,
.lds-dual-ring:after {
  box-sizing: border-box;
}
.lds-dual-ring {
  display: inline-block;
  width: 80px;
  height: 80px;
}
.lds-dual-ring:after {
  content: " ";
  display: block;
  width: 64px;
  height: 64px;
  margin: 8px;
  border-radius: 50%;
  border: 6.4px solid currentColor;
  border-color: currentColor transparent currentColor transparent;
  animation: lds-dual-ring 1.2s linear infinite;
}
@keyframes lds-dual-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
`