import React from 'react'
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'loading' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

// ✅ Proper event system (no hacks)
type ToastEvent =
  | { type: 'add'; toast: Toast }
  | { type: 'remove'; id: string }

// Global listeners
let toastListeners: Array<(event: ToastEvent) => void> = []

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  React.useEffect(() => {
    const handler = (event: ToastEvent) => {
      if (event.type === 'remove') {
        setToasts(prev => prev.filter(t => t.id !== event.id))
        return
      }

      const toast = event.toast

      setToasts(prev => [...prev, toast])

      // ✅ Auto remove (except loading)
      if (toast.type !== 'loading') {
        const duration = toast.duration ?? 3000

        setTimeout(() => {
          removeToast(toast.id)
        }, duration)
      }
    }

    toastListeners.push(handler)

    return () => {
      toastListeners = toastListeners.filter(l => l !== handler)
    }
  }, [])

  return {
    toasts,
    removeToast: (id: string) => removeToast(id),
  }
}

// ✅ Show toast
export function showToast(options: Omit<Toast, 'id'>) {
  const id = `toast-${Date.now()}-${Math.random()}`

  const toast: Toast = {
    ...options,
    id,
  }

  toastListeners.forEach(listener =>
    listener({ type: 'add', toast })
  )

  return id
}

// ✅ Proper remove (no fake toast)
export function removeToast(id: string) {
  toastListeners.forEach(listener =>
    listener({ type: 'remove', id })
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = React.useState(false)

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 150)
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="w-5 h-5 text-blue-500" />
    }
  }

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'loading':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getTitleColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-900'
      case 'error':
        return 'text-red-900'
      case 'loading':
        return 'text-blue-900'
      default:
        return 'text-gray-900'
    }
  }

  const getMessageColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-700'
      case 'error':
        return 'text-red-700'
      case 'loading':
        return 'text-blue-700'
      default:
        return 'text-gray-700'
    }
  }

  return (
    <div
      className={`${getBackgroundColor()} border rounded-lg p-4 flex gap-3 shadow-lg transform transition-all duration-150 ${
        isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      <div className="shrink-0 mt-0.5">{getIcon()}</div>

      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${getTitleColor()}`}>
          {toast.title}
        </p>

        {toast.message && (
          <p className={`text-sm mt-1 ${getMessageColor()}`}>
            {toast.message}
          </p>
        )}
      </div>

      {toast.type !== 'loading' && (
        <button
          onClick={handleClose}
          className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-9999 space-y-3 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}