export interface Toast {
  id: number
  message: string
  variant: 'success' | 'error' | 'info'
}

let nextId = 1

/** App-wide toasts. State survives client-side navigation, so you can toast and then navigateTo(). */
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  const dismiss = (id: number) => (toasts.value = toasts.value.filter((t) => t.id !== id))
  const show = (message: string, variant: Toast['variant'] = 'success', ms = 5000) => {
    const id = nextId++
    toasts.value = [...toasts.value, { id, message, variant }]
    if (import.meta.client) setTimeout(() => dismiss(id), ms)
  }
  return { toasts, show, dismiss }
}
