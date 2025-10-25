import { closeToast, showToast } from './notificationComp'


export const notification = {
  error({ title, message, showProgress, key, duration }: { title?: string, message?: string, showProgress?: boolean, key?: any, duration?: number }) {
    const toast = showToast({
      title: title || 'Error',
      message: message || '',
      showProgress: showProgress === false ? false : true,
      type: 'error',
      onClick: () => {
        closeToast(toast.id)
      },
      key: key || 'error',
      duration: duration || 5000,
    })
  },
  success({ title, message, showProgress, key, duration }: { title?: string, message?: string, showProgress?: boolean, key?: any, duration?: number }) {
    const toast = showToast({
      title: title || 'Success',
      message: message || '',
      showProgress: showProgress === false ? false : true,
      type: 'success',
      onClick: () => {
        closeToast(toast.id)
      },
      key: key || 'success',
      duration: duration || 5000,
    })
  },
  warning({ title, message, showProgress, key, duration }: { title?: string, message?: string, showProgress?: boolean, key?: any, duration?: number }) {
    const toast = showToast({
      title: title || 'Warning',
      message: message || '',
      showProgress: showProgress === false ? false : true,
      type: 'warning',
      onClick: () => {
        closeToast(toast.id)
      },
      key: key || 'warning',
      duration: duration || 5000,
    })
  },
  info({ title, message, showProgress, key }: { title?: string, message?: string, showProgress?: boolean, key?: any }) {
    const toast = showToast({
      title: title || 'Notification',
      message: message || '',
      showProgress: showProgress === false ? false : true,
      type: 'info',
      onClick: () => {
        closeToast(toast.id)
      },
      key: key || 'notification',
    })
  },
}
