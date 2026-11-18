import { reactive } from 'vue'

const toasts = reactive([])
let idSeq = 0

function add({ type = 'info', title, message = '', duration = 4000 }) {
  const id = ++idSeq
  toasts.push({ id, type, title, message, duration })
  setTimeout(() => remove(id), duration)
}

function remove(id) {
  const i = toasts.findIndex(t => t.id === id)
  if (i !== -1) toasts.splice(i, 1)
}

export function useToast() {
  return {
    toasts,
    remove,
    success: (title, message = '') => add({ type: 'success', title, message }),
    error:   (title, message = '') => add({ type: 'error',   title, message }),
    warning: (title, message = '') => add({ type: 'warning', title, message }),
    info:    (title, message = '') => add({ type: 'info',    title, message }),
  }
}
