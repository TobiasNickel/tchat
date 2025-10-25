import { dom, escapeHtml } from './dom'
import { css } from './css'
import { deferredPromise } from './utils'
import { notification } from './notificationStyle'

type TOrPromise<T> = T | Promise<T>

export type TPromiseModalFormField = { type: 'text', name: string, label?: string, initialValue?: TOrPromise<string>, tooltip?: string, minLength?: number, maxLength?: number, required?: boolean, onChange?: (e: Event, value: string, elements: Record<string, HTMLElement>) => any }
  | { type: 'password', name: string, label?: string, initialValue?: TOrPromise<string>, tooltip?: string, required?: boolean, onChange?: (e: Event, value: string, elements: Record<string, HTMLElement>) => any }
  | { type: 'checkbox', name: string, label?: string, description: string, initialValue?: TOrPromise<boolean>, tooltip?: string, required?: boolean, onChange?: (e: Event, value: boolean, elements: Record<string, HTMLElement>) => any }
  | { type: 'date', name: string, label?: string, initialValue?: TOrPromise<string>, tooltip?: string, required?: boolean, onChange?: (e: Event, value: string, elements: Record<string, HTMLElement>) => any }
  | { type: 'file', name: string, label?: string, accept?: string, tooltip?: string, required?: boolean, onChange?: (e: Event, value: string, elements: Record<string, HTMLElement>) => any }
  | { type: 'number', name: string, label?: string, initialValue?: TOrPromise<number>, tooltip?: string, required?: boolean, onChange?: (e: Event, value: number, elements: Record<string, HTMLElement>) => any }
  | { type: 'textarea', name: string, label?: string, initialValue?: TOrPromise<string>, rows?: number, tooltip?: string, required?: boolean, onChange?: (e: Event, value: string, elements: Record<string, HTMLElement>) => any }
  | { type: 'separator' }
  | { type: 'select', name: string, label?: string, disabled?: boolean, multi?: boolean, options: TOrPromise<{ label?: string, value: string, selected?: boolean }[]>, tooltip?: string, required?: boolean, onChange?: (e: Event, value: string | string[], elements: Record<string, HTMLElement>) => any }
  | { type: 'radio', name: string, label?: string, options: TOrPromise<{ label?: string, value: string, selected?: boolean }[]>, tooltip?: string, required?: boolean, onChange?: (e: Event, value: string, elements: Record<string, HTMLElement>) => any }
  | { type: 'range', name: string, label?: string, initialValue?: TOrPromise<number>, min?: number, max?: number, step?: number, tooltip?: string, required?: boolean, onChange?: (e: Event, value: number, elements: Record<string, HTMLElement>) => any }
  | { type: 'buttons', float?: 'left' | 'right', buttons: { name: string, label: string }[] }
  | { type: 'headline', text: TOrPromise<string>, order?: 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: 'paragraph', text: TOrPromise<string> }
  | { type: 'color', name: string, label?: string, initialValue?: TOrPromise<string>, tooltip?: string, required?: boolean }

export type TPromiseModalFormFieldFieldType = TPromiseModalFormField['type']

export type TPromiseModalFormViewArgs = {
  fields: TPromiseModalFormField[];
  onRendered?: (elements: Record<string, HTMLElement>) => void;
  title: string;
  description?: string;
  submitText?: string;
  cancelText?: string;
  buttons?: { name: string, label: string }[]
}

type TPromiseModalFormViewResponse = {
  [key: string]: any;
  button: string;
}

export function failedToSubmit() {
  notification.warning({
    message: 'Please fill all the required fields'
  });
}

//   //ArrayType<T['fields']>[K] extends { name: infer N, type: infer T, initialValue?: infer I } ? I extends TOrPromise<infer V> ? V : I : never
export function promiseModalFormView<Input extends TPromiseModalFormViewArgs>({ fields, title, submitText, cancelText, buttons, description, onRendered: onRenderedEvent }: Input): Promise<{ [x: string]: any, button: string, }> {
  return new Promise((resolve, reject) => {
    submitText = submitText || 'Submit'
    cancelText = cancelText || 'Cancel'
    const modal = document.createElement('div');
    modal.classList.add('promiseModalFormView');
    const onRendered = deferredPromise<void>();
    modal.innerHTML = `
      <div class="promiseModalFormView-content bg-background" id="promiseModalFormViewWindow">
       <div class="close" id='promiseModalFormViewCancel'>
       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-6 w-6 bg-[#1392A8] hover:bg-[#004E6A] rounded-sm text-white "><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
       </div>
        <h2 id="modal_title_headline">${escapeHtml(title)}</h2>
        ${description ? `<p class="leading-[1.4]">${escapeHtml(description)}</p>` : ""}
        ${fields
        .map((field) => {
          const tooltip = (field as any).tooltip
            ? `<span class="tooltip right" style="float: right" data-tool-tip="${(field as any).tooltip}">?</span>`
            : "";
          const requiredHtml = `${(field as any).required ? ' <span style="color: red;">*</span> ' : ' '}`


          // if (field.type === "text") {
          //   onRendered.promise.then(async () => {
          //     const initialValue = await field.initialValue;
          //     if (initialValue) {
          //       (elements[field.name] as any as HTMLInputElement).value =
          //         initialValue;
          //     }
          //     if (field.onChange) {
          //       (elements[field.name] as any as HTMLInputElement).addEventListener('change', (e) => {
          //         field.onChange?.(e, (elements[field.name] as any as HTMLInputElement).value, elements)
          //       })
          //     }
          //   });
          //   return `<p><label style="font-weight:bold; font-size:12px;margin-bottom:8px">${field.label || field.name}${tooltip} ${requiredHtml}</label><input type="text" ${typeof field.minLength === 'number' ? 'minlength="' + field.minLength + '"' : ''} ${typeof field.maxLength === 'number' ? 'maxlength="' + field.maxLength + '"' : ''} id="${field.name}" value="${field.initialValue || ""
          //     }" style="margin-bottom:16px; font-size: 14px;"></p>`;
          // }
          if (field.type === "text") {
            onRendered.promise.then(async () => {
              const initialValue = await field.initialValue;
              if (initialValue) {
                (elements[field.name] as any as HTMLInputElement).value =
                  initialValue;
              }
              if (field.onChange) {
                (elements[field.name] as any as HTMLInputElement).addEventListener("change", (e) => {
                  field.onChange?.(
                    e,
                    (elements[field.name] as any as HTMLInputElement).value,
                    elements
                  );
                });
                (elements[field.name] as any as HTMLInputElement).addEventListener("keyup", (e) => {
                    const inputEl = elements[field.name] as any as HTMLInputElement;
                    const currentCursorPosition = inputEl.selectionStart;
                    field.onChange?.(e, inputEl.value, elements);
                    // Restore cursor position after onChange
                    if (document.activeElement === inputEl && typeof currentCursorPosition === "number") {
                    inputEl.setSelectionRange(currentCursorPosition, currentCursorPosition);
                    }
                });
              }
              if (field.name === "ref") {
                const input = elements[field.name] as HTMLInputElement;
                const errorEl = document.createElement("div");
                errorEl.style.color = "red";
                errorEl.style.fontSize = "12px";
                errorEl.style.marginTop = "-12px";
                errorEl.style.marginBottom = "16px";
                errorEl.style.display = "none";
                errorEl.textContent = "Maximum length is 5 for ref";
                input.insertAdjacentElement("afterend", errorEl);

                input.addEventListener("input", () => {
                  if (input.value.length > 5) {
                    errorEl.style.display = "block";
                    (elements.submit as HTMLButtonElement).disabled = true;
                  } else {
                    errorEl.style.display = "none";
                    (elements.submit as HTMLButtonElement).disabled = false;
                  }
                });
              }
            });

            return `<p>
            <label style="font-weight:bold; font-size:12px;margin-bottom:8px">
                ${escapeHtml(field.label || field.name)}${tooltip} ${requiredHtml}
            </label>
            <input type="text"  ${typeof field.minLength === "number" ? 'minlength="' + field.minLength + '"' : ""}
                ${typeof field.maxLength === "number" ? 'maxlength="' + field.maxLength + '"' : ""}
                id="${escapeHtml(field.name)}"
                style="margin-bottom:16px; font-size: 14px;">
            </p>`;
          }


          if (field.type === "password") {
            onRendered.promise.then(async () => {
              const initialValue = await field.initialValue;
              if (initialValue) {
                (elements[field.name] as any as HTMLInputElement).value = initialValue;
              }
              if (field.onChange) {
                (elements[field.name] as any as HTMLInputElement).addEventListener('change', (e) => {
                  field.onChange?.(e, (elements[field.name] as any as HTMLInputElement).value, elements)
                })
              }
            });
            return `<p><label style="font-weight:bold; font-size:14px;margin-bottom:8px">${escapeHtml(field.label || field.name)
              }  ${tooltip}${requiredHtml}</label><input type="password" id="${escapeHtml(field.name)
              }"></p>`;
          }
          if (field.type === "checkbox") {
            onRendered.promise.then(async () => {
              const initialValue = await field.initialValue;
              if (initialValue) {
                (elements[field.name] as any as HTMLInputElement).checked = initialValue;
              }
              if (field.onChange) {
                (elements[field.name] as any as HTMLInputElement).addEventListener('change', (e) => {
                  field.onChange?.(e, (elements[field.name] as any as HTMLInputElement).checked, elements)
                })
              }
            });
            return `<p>
              <label style="font-weight:bold; font-size:14px;margin-bottom:8px">${escapeHtml(field.label || field.name || '')}${tooltip || ''}${requiredHtml || ''}</label>
              <input type="checkbox" id="${escapeHtml(field.name)}" style="width:24px; height:24px; accent-color: #1392a8; vertical-align: middle;">
              <span style="margin-left: 10px;">${escapeHtml(field.description || '')}</span>
            </p>`;
          }
          if (field.type === "file") {
            onRendered.promise.then(async () => {
              if (field.onChange) {
                (elements[field.name] as any as HTMLInputElement).addEventListener('change', (e) => {
                  field.onChange?.(e, (elements[field.name] as any as HTMLInputElement).value, elements)
                })
              }
            });
            return `<p><label style="font-weight:bold; font-size:14px;margin-bottom:8px">${escapeHtml(field.label || field.name)
              }${tooltip}${requiredHtml}</label><input type="file" id="${escapeHtml(field.name)}"${field.accept ? ` accept=${escapeHtml(field.accept)}` : ""
              }></p>`;
          }
          if (field.type === "date") {
            onRendered.promise.then(async () => {
              const initialValue = await field.initialValue;
              if (initialValue) {
                (elements[field.name] as any as HTMLInputElement).value = initialValue;
              }
              if (field.onChange) {
                (elements[field.name] as any as HTMLInputElement).addEventListener('change', (e) => {
                  field.onChange?.(e, (elements[field.name] as any as HTMLInputElement).value, elements)
                })
              }
            });
            return `<p><label style="font-weight:bold; font-size:14px;margin-bottom:8px">${field.label || field.name
              }${tooltip}${requiredHtml}</label><input type="date" id="${field.name}" value="${field.initialValue || ""
              }"></p>`;
          }
          if (field.type === "number") {
            onRendered.promise.then(async () => {
              const initialValue = await field.initialValue;
              if (initialValue) {
                (elements[field.name] as any as HTMLInputElement).value = initialValue.toString();
              }
              if (field.onChange) {
                (elements[field.name] as any as HTMLInputElement).addEventListener('change', (e) => {
                  field.onChange?.(e, (elements[field.name] as any).value, elements)
                })
              }
            });
            return `<p><label style="font-weight:bold; font-size:14px;margin-bottom:8px">${escapeHtml(field.label || field.name)
              }${tooltip}${requiredHtml}</label><input type="number" id="${escapeHtml(field.name)
              }"></p>`;
          }
          if (field.type === "textarea") {
            onRendered.promise.then(async () => {
              const initialValue = await field.initialValue;
              if (initialValue) {
                (elements[field.name] as any as HTMLTextAreaElement).value = initialValue;
              }
              if (field.onChange) {
                (elements[field.name] as any as HTMLTextAreaElement).addEventListener('change', (e) => {
                  field.onChange?.(e, (elements[field.name] as any as HTMLTextAreaElement).value, elements)
                })
              }
            });
            return `<p><label style="font-weight:bold; font-size:14px;margin-bottom:8px">${escapeHtml(field.label || field.name)
              }${tooltip}${requiredHtml}</label><textarea id="${escapeHtml(field.name)}" rows="${field.rows || 3
              }" style="margin-bottom:16px"></textarea></p>`;
          }
          if (field.type === "select") {
            onRendered.promise.then(async () => {
              const options = await field.options;
              const optionsString = options
                .map(
                  (option) =>
                    `<option value="${escapeHtml(option.value)}" ${option.selected ? "selected" : ""
                    }>${escapeHtml(option.label || option.value)}</option>`
                )
                .join("");
              if (!options.length) {
                elements[field.name]!.setAttribute('disabled', 'true')
              }
              elements[field.name]!.innerHTML = optionsString;
              if (field.onChange) {
                (elements[field.name] as any as HTMLSelectElement).addEventListener('change', (e) => {
                  const value = field.multi ? Array.from((elements[field.name] as any).children)
                    .filter((optionElement: any) => (optionElement as HTMLOptionElement).selected)
                    .map((optionElement: any) => (optionElement as HTMLOptionElement).value) : (elements[field.name] as any).value
                  field.onChange?.(e, value, elements)
                })
              }
            });
            return `<p><label style="font-weight:bold; font-size:12px; margin-bottom:8px">
                ${escapeHtml(field.label || field.name)}${tooltip}${requiredHtml}</label>
                <select id="${escapeHtml(field.name)}" ${field.multi ? 'multiple="true"' : ""}${field.disabled === true ? 'disabled="true"' : ''} style="margin-bottom:16px"></select>
              </p>`;
          }
          if (field.type === "radio") {
            onRendered.promise.then(async () => {
              const options = await field.options;
              const optionsString = options
                .map(
                  (option) =>
                    `<label><input type="radio" name="${escapeHtml(field.name)}" value="${escapeHtml(option.value)
                    }" ${option.selected ? "checked" : ""}>${escapeHtml(option.label || option.value)
                    }</label>`
                )
                .join("<br />");
              elements[field.name]!.innerHTML = optionsString;
              if (field.onChange) {
                (elements[field.name] as any as HTMLInputElement).addEventListener('change', (e) => {
                  const value = Array.from((elements[field.name] as any).children)
                    .filter((optionElement: any) => (optionElement as HTMLInputElement)?.checked)
                    .map((optionElement: any) => (optionElement as HTMLInputElement)?.value)
                  field.onChange?.(e, value[0]!, elements)
                })
              }
            });
            return `<p><label style="font-weight:bold; font-size:12px;margin-bottom:8px">${escapeHtml(field.label || field.name
              )}${tooltip}${requiredHtml}</label><div class="radioGroup" id="${escapeHtml(field.name
              )}" style="margin-bottom:16px"></div></p>`;
          }
          if (field.type === "range") {
            onRendered.promise.then(async () => {
              const initialValue = await field.initialValue;
              if (initialValue) {
                (elements[field.name] as any as HTMLInputElement).value =
                  initialValue.toString();
              }
              if (field.onChange) {
                (elements[field.name] as any as HTMLInputElement).addEventListener('change', (e) => {
                  field.onChange?.(e, (elements[field.name] as any).value, elements)
                })
              }
            });
            return `<p><label style="font-weight:bold; font-size:12px;margin-bottom:8px">${escapeHtml(field.label || field.name
              )}${tooltip}${requiredHtml}</label><input type="range" id="${escapeHtml(field.name
              )}" value="${field.initialValue || 0}" min="${field.min || 0
              }" max="${field.max || 100}" step="${field.step || 1}" style="margin-bottom:16px"></p>`;
          }
          // if (field.type === "color") {
          //   onRendered.promise.then(async () => {
          //     const initialValue = await field.initialValue;
          //     if (initialValue)
          //       (elements[field.name] as HTMLInputElement).value = initialValue;
          //   });
          //   return `<p><label style="font-weight:bold; font-size:12px;margin-bottom:8px">
          //     ${field.label || field.name}${tooltip}</label>
          //     <input type="color" id="${field.name}">
          //   </p>`;
          // }
          if (field.type === "color") {
            onRendered.promise.then(async () => {
              const initialValue = await field.initialValue;
              if (initialValue)
                (elements[field.name] as HTMLInputElement).value = initialValue;
            });
            return `<p><label style="font-weight:bold; font-size:12px;margin-bottom:8px">
                ${escapeHtml(field.label || field.name)}${tooltip}${requiredHtml}</label>
                <input type="color" id="${escapeHtml(field.name)}" style="margin-bottom:16px; height: 42px; background-color: white;">
              </p>`;
          }
          if (field.type === "separator") {
            return `<p><hr></p>`;
          }
          if (field.type === "buttons") {
            return `<p style="float: ${field.float ? field.float : "right"}">
              ${field.buttons
                .map(
                  (button) =>
                    `<button id="${escapeHtml(button.name)}" type="button">${escapeHtml(button.label)}</button>`
                )
                .join("")}
            </p>`;
          }
          if (field.type === "headline") {
            const id = "headline_" + Math.random().toString(36).substring(3);
            onRendered.promise.then(async () => {
              const text = await field.text;
              elements[id]!.innerText = text;
            });
            const order = field.order || 3;
            return `<h${order} id="${id}"></h${order}>`;
          }
          if (field.type === "paragraph") {
            const id = "headline_" + Math.random().toString(36).substring(3);
            onRendered.promise.then(async () => {
              const text = await field.text;
              elements[id]!.innerText = text;
            });
            return `<p id="${id}"></p>`;
          }
        })
        .join("")}
        <p class="buttonsRow">
        ${fields.some((field) => field.type === "text" && field.required)
        ? `<span id="mandatory_container" style="display: flex; align-items: center;">
            <span id="mandatory_headline" style="display: flex; align-items: center;">
              <span style="color: red; margin-right: 2px; margin-top:5px">*</span>
              <span id="mandatory_span">= &nbsp; mandatory</span>
            </span>
          </span>`
        : ''
      }
          <button id='cancel' type="button" class="cancel ">${escapeHtml(cancelText)}</button>
          ${buttons
        ? buttons
          .map(
            (button) => `<button id="${escapeHtml(button.name)}" type="button">${escapeHtml(button.label)}</button>`
          )
          .join("")
        : ""
      }
          <button id='submit' type="submit " class="bg-primary">${escapeHtml(submitText)}</button>
        </p>
      </div>
    `;
    const elements = dom.idElements(modal)
    onRendered.promise.then(() => {
      if (onRenderedEvent) {
        onRenderedEvent(elements)
      }
    })
    onRendered.resolve()

    async function getData() {
      const data: TPromiseModalFormViewResponse = { button: '' }
      await Promise.all(fields.map(async field => {
        if (field.type === 'buttons') return
        if (field.type === 'separator') return
        if (field.type === 'headline') return
        if (field.type === 'paragraph') return
        if (field.type === 'range') {
          data[field.name] = parseFloat((elements[field.name] as any).value)
          return
        }
        if (field.type === 'number') {
          data[field.name] = parseInt((elements[field.name] as any).value)
          return
        }

        if (field.type === 'file') {
          data[field.name] = (elements[field.name] as any).files[0]
          return
        }
        if (field.type === 'select') {
          const value = Array.from((elements[field.name] as any).children)
            .filter((optionElement: any) => (optionElement as HTMLOptionElement).selected)
            .map((optionElement: any) => (optionElement as HTMLOptionElement).value)
          data[field.name] = field.multi ? value : value[0]
          return
        }
        if (field.type === 'radio') {
          const value = // Array.from(elements.deleteOption.children).map(e=>e?.children[0]).filter(i=>i?.checked).map(i=>i.value)
            Array.from((elements[field.name] as any).children).map((e: any) => e.children[0])
              .filter((optionElement: any) => (optionElement as HTMLInputElement)?.checked)
              .map((optionElement: any) => (optionElement as HTMLInputElement)?.value)
          data[field.name] = value[0]
          return
        }
        data[field.name] = (elements[field.name] as any)?.value
      }))
      return data
    }

    elements.submit!.addEventListener('click', async () => {
      const data = await getData()
      data.button = 'submit'
      if (
        fields.some(
          (field) => "required" in field && field.required && !data[field.name]
        )
      ) {
        const inputs = modal.querySelectorAll('input')
        inputs.forEach(input => {
          if (!input.value) {
            input.style.border = "1px solid red"
          }
        })
        failedToSubmit()
        return;
      } else {
        modal.remove()
        resolve(data)
      }
    })
    elements.cancel!.addEventListener('click', async (e) => {
      e.stopPropagation()
      const data = await getData()
      data.button = 'cancel'
      reject(data)
      modal.remove();
    })
    fields.forEach(field => {
      if (field.type === "text" && field.required) {
        elements[field.name]!.addEventListener('input', () => {
          if ((elements[field.name] as any).value) {
            (elements[field.name] as any).style.border = "";
          }
        });
      }
    })
    fields.forEach(field => {
      if (field.type === "buttons") {
        field.buttons.forEach(button => {
          elements[button.name]!.addEventListener('click', async () => {
            const data = await getData()
            data.button = button.name
            resolve(data)
            modal.remove()
          })
        })
      }
    })
    if (buttons) {
      buttons.forEach(button => {
        elements[button.name]!.addEventListener('click', async () => {
          const data = await getData()
          data.button = button.name
          resolve(data)
          modal.remove()
        })
      })
    }
    let lastX = 0
    let lastY = 0
    elements.modal_title_headline!.addEventListener('mousedown', (e) => {
      e.preventDefault()
      const startX = e.clientX - lastX
      const startY = e.clientY - lastY
      const modalWindow = elements.promiseModalFormViewWindow!
      const mousemove = (e: MouseEvent) => {
        modalWindow.style.transform = `translate(${e.clientX - startX}px, ${e.clientY - startY}px)`;
        lastX = e.clientX - startX
        lastY = e.clientY - startY
      }
      const mouseup = () => {
        document.removeEventListener('mousemove', mousemove)
        document.removeEventListener('mouseup', mouseup)
      }
      document.addEventListener('mousemove', mousemove)
      document.addEventListener('mouseup', mouseup)
    })
    elements.promiseModalFormViewCancel!.addEventListener('click', async () => {
      const data = await getData()
      data.button = 'cancel'
      reject(data)
      modal.remove()
    })
    let lastMouseDownElement: HTMLElement | null = null
    modal.addEventListener('mousedown', (e) => {
      if (e.target instanceof HTMLElement) {
        lastMouseDownElement = e.target;
      }
    })
    modal.addEventListener('mouseup', async (e) => {
      if (e.target === modal && lastMouseDownElement === modal) {
        const data = await getData()
        data.button = 'cancel'
        reject(data)
        modal.remove()
      }
      lastMouseDownElement = null;
    })
    document.body.append(modal)
    const firstFieldName: string = (fields[0] as any)?.name || 'submit'
    if (firstFieldName) {
      elements[firstFieldName]?.focus()
    }
  })
}

css`

/* .promiseModalFormView is the backdrop */
.promiseModalFormView {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background: linear-gradient(rgba(0, 97, 132, 0.5), rgba(0, 78, 106, 0.5));
  color: #222222;
  z-index:50;
}
.promiseModalFormView label{
  user-select: none;
}
/* .promiseModalFormView-content is the modal itself */
.promiseModalFormView-content {
  background-color: #fefefe;
  margin: 0;
  padding: 20px;
  border: 1px solid #888;
  width: 80%;
  max-width: 600px;
  max-height: 80%;
  overflow-y: auto;
  position: relative;
  overflow-x: show;
}
.promiseModalFormView-content .close {

  position: absolute;
  right: 20px;
  top: 20px;
  padding: 0;
  cursor: pointer;
  -webkit-transition: all 200ms ease-out;
  transition: all 200ms ease-out;

}

  .promiseModalFormView-content .close:hover {
   background-color: #004e6a;
  }

.promiseModalFormView h2 {
  margin: 0;
  cursor: move;
  font-weight: 600;
  font-size:24px;
  margin-bottom:16px;
  font-family:"Khand";
}
.promiseModalFormView p {
  margin: 0;
  padding-top: 10px;
  clear: both;
}
.promiseModalFormView p label {
  display: block;
}
.promiseModalFormView p input, .promiseModalFormView p textarea, .promiseModalFormView p select {
  padding: 5px;
  border-radius: 0;
  border: 1px solid #ccc;
  width: 100%;
  margin-top: 5px;
}
.promiseModalFormView p input[type="checkbox"] {
  width: auto;
  margin-right: 10px;
}

textarea:focus, input:focus{

outline: 2px solid var(--blueHover)
}


.promiseModalFormView p button {
  padding: 5px 10px;
  margin: 10px 10px 0 10px;
}
.promiseModalFormView p button:last-child {
  margin-right: 0;
}
.promiseModalFormView p button:first-child {
  margin-left: 0;
}

.promiseModalFormView p button.cancel {
  margin-left: 10px;
}
.promiseModalFormView p.buttonsRow {
  display: flex;
  justify-content:end;
}

.promiseModalFormView .radioGroup {
  padding: 5px;
}
.promiseModalFormView .radioGroup input[type="radio"] {
  margin: 0px 10px;
  accent-color: var(--primary-color);
}
.promiseModalFormView .radioGroup input[type="radio"]:focus {
  box-shadow: 0 0 0 1px var(--primary-color);
}

.promiseModalFormView h1 {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
}
.promiseModalFormView h2 {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 16px;
}
.promiseModalFormView h3 {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
}
.promiseModalFormView h4 {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 16px;
}
.promiseModalFormView h5 {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 16px;
}
.promiseModalFormView h6 {
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 16px;
}

.promiseModalFormView #submit[disabled] {
  background: #516100;
  color:rgba(255, 255, 255, 1);
}
.promiseModalFormView #submit[disabled]:hover {
  background: #516100 !important;
  color:rgba(255, 255, 255, 1);
}

#mandatory_span{
  font-size:10px;
  display:flex;
  align-items:center;
  margin-left:5px;
}
#mandatory_container{
  display: flex;
  align-items:center;
  justify-content: space-between;
  width:100%;
}
#mandatory_headline{
  display:flex;
  align-items:center;
}
#cancel{
  color: #222222 !important;
}
#promiseModalFormViewCancel{
  background: rgba(19, 146, 168, 1);
  color:rgba(255, 255, 255, 1);

  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-content: center;
  align-items: center;
  border-radius:3px;
  padding: 0;

}

#promiseModalFormViewCancel:hover{
  background: #004e6a;
}
.promiseModalFormView p select{
  background:#fff;
}

`
