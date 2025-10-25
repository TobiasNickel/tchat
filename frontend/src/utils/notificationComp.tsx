import React from 'react';
import { css } from './css';
import { makeAtom, useAtom } from './atom';
// import { XCircleIcon } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

// type ToastPlacement = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

type ToastOptions = {
  title?: string;
  message?: string;
  type?: ToastType;
  key?: string;
  showProgress?: boolean;
  duration?: number;
  style?: React.CSSProperties;
  closeIcon?: React.ReactNode;
 //  placement?: ToastPlacement;
  onClick?: () => void;
};

type Toast = {
  id: string;
  key?: string;
  title?: string;
  duration?: number;
  message?: string;
  type?: ToastType;
  style?: React.CSSProperties;
  closeIcon?: React.ReactNode;
  // placement?: ToastPlacement;
  onClick?: () => void;
  timeoutId?: number;
};

let nextId = 0;
const getId = () => {
  nextId += 1;
  return `toast-${nextId}`;
}
const toastsAtom = makeAtom([] as Toast[], {}, 'toasts')

export function closeToast(id: string) {
  const toast = toastsAtom.state.find((t) => t.id === id)
  if (toast) {
    clearTimeout(toast.timeoutId);
    toastsAtom.set(toastsAtom.state.filter((t) => t.id !== id))
  }
}

export function showToast(options: ToastOptions) {
    const id = getId()
    const newToast: Toast = {
      id,
      key: options.key || id,//|| options.title ||  id,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      duration:options.duration || 3000,
      style: options.style,
      closeIcon: options.closeIcon,
      // placement: options.placement || 'bottomRight',
      timeoutId: setTimeout(() => {
        // setToasts((prev) => prev.filter((t) => t.id !== id));
        toastsAtom.set(toastsAtom.state.filter((t) => t.id !== id))
      }, options.duration || 3000) as any as number
    };

    const existingToast = toastsAtom.state.find((t) => t.key === newToast.key)
    if (existingToast) {
      // clearTimeout(existingToast.timeoutId);
      toastsAtom.set(toastsAtom.state.map((t) => {
        if (t.key === newToast.key) {
          return newToast
        }
        return t;
      }));
      return newToast
    }

    toastsAtom.set([...toastsAtom.state, newToast])
    return newToast
}

export function ToastDisplay() {
  const toasts = useAtom(toastsAtom)
  return (
    <div className={`toast-container bottomRight`}>
      {/* here we are doing the hide for the successfully messages now but if needed to change then just remove the filter or adjust */}
      {toasts.filter((toast) => toast.type !== "success").map((toast) => (
        <div
          key={toast.key || toast.id}
          className={`toast toast-${toast.type}`}
          style={toast.style}
        >
            {getIconForType(toast.type)}
          <button
            className="toast-close"
            onClick={() => {
              toastsAtom.set(toastsAtom.state.filter((t) => t.id !== toast.id))
              if(toast.onClick) {
                toast.onClick()
              }
            }}
          >
            {toast.closeIcon || "×"}
          </button>
          <div>
          {toast.title && <div className="toast-title">{toast.title}</div>}
          {toast.message && (
            <div className="toast-message">{toast.message}</div>
          )}
          </div>
        </div>
      ))}
    </div>
  );
}


const DefaultSuccessIcon = () => {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="26" cy="26" r="26" fill="#4D6E00"/>
    <path d="M36.3334 21L23.5 33.8333L17.6667 28" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>

  );
};

const DefaultErrorIcon = () => {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="26" cy="26" r="26" fill="#B1421C"/>
    <path d="M33.9551 18.2949L18.0452 34.2048" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M33.9551 34.2051L18.0452 18.2952" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

const DefaultNotificationIcon = () => {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="26" cy="26" r="26" fill="#1392A8"/>
      <circle cx="26" cy="26" r="17" stroke="white" strokeWidth="4"/>
      <path d="M26 20L26 19" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M26 34L26 26" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>

  )
}

const DefaultWarningIcon = () => {
  return (<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="26" cy="26" r="26" fill="#FFD61B"/>
    <path d="M21.746 10.8874C23.6999 7.72402 28.3001 7.72403 30.254 10.8874L42.2889 30.3725C44.3464 33.7037 41.9502 38 38.0349 38H13.9651C10.0498 38 7.65363 33.7036 9.71108 30.3725L21.746 10.8874Z" fill="#BCAF6E"/>
    <path d="M26 31L26 32" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M26 17L26 25" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const getIconForType = (type: ToastType = 'info') => {
  switch (type) {
    case 'success':
      return <DefaultSuccessIcon />;
    case 'error':
      return <DefaultErrorIcon />;
    case 'warning':
      return <DefaultWarningIcon />;
    case 'info':
    default:
      return <DefaultNotificationIcon />;
  }
};


css`
.toast-message {
  font-size: 16px;
}

.toast-title{
  font-size: 24px;
  font-family:Khand;
  font-weight: 600;
  margin-bottom: 5px;
  margin-right: 32px;
}

.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transform: scale(0.8);
  transform-origin: bottom;
}

.topRight {
  top: 16px;
  right: 16px;
}

.topLeft {
  top: 16px;
  left: 16px;
}

.bottomRight {
  bottom: 16px;
  right: 16px;
  top: initial;
  left: initial;
}

.bottomLeft {
  bottom: 16px;
  left: 16px;
  top: initial;
  right: initial;
}

.toast {
  position: relative;
  padding: 12px 16px;
  border-radius: 6px;
  color: #fff;
  font-weight: 500;
  min-width: 200px;
  max-width: 320px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  animation: fadeIn 0.3s ease;
  display: flex;
  justify-content: flex-start;
  gap:15px;
  align-items: flex-start;
}

.toast-close {
  position: absolute;
  top: 10px;
  right: 8px;
  width:24px;
  height:24px;
  border: none;
  color: black;
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
  background:rgba(255, 255, 255, 1);
  font-size:24px;
  border-radius: 3px  ;
}

.toast-info { background: #1890ff; color:#222 }
.toast-success { background: rgba(209, 223, 176, 1); color:#222 }
.toast-error { background: rgba(224, 192, 181, 1); color:#222 }
.toast-warning { background: #faad14;  color:#222}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
`
