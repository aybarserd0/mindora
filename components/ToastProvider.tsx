'use client'

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

type ToastType = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  title: string
  description?: string
  type: ToastType
}

type ToastContextType = {
  showToast: (
    title: string,
    description?: string,
    type?: ToastType
  ) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }

  return context
}

function getToastClasses(type: ToastType) {
  if (type === 'success') {
    return 'border-emerald-100 bg-emerald-50 text-emerald-900'
  }

  if (type === 'error') {
    return 'border-red-100 bg-red-50 text-red-900'
  }

  return 'border-black/10 bg-white text-[#171717]'
}

export default function ToastProvider({
  children,
}: {
  children: ReactNode
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timeoutMap = useRef<Record<string, NodeJS.Timeout>>({})

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))

    if (timeoutMap.current[id]) {
      clearTimeout(timeoutMap.current[id])
      delete timeoutMap.current[id]
    }
  }, [])

  const showToast = useCallback(
    (
      title: string,
      description?: string,
      type: ToastType = 'info'
    ) => {
      const id = crypto.randomUUID()

      const toast: ToastItem = {
        id,
        title,
        description,
        type,
      }

      setToasts((current) => [...current, toast])

      timeoutMap.current[id] = setTimeout(() => {
        removeToast(id)
      }, 4500)
    },
    [removeToast]
  )

  const value = useMemo(
    () => ({
      showToast,
    }),
    [showToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur transition-all duration-300 animate-in slide-in-from-top-3 ${getToastClasses(
              toast.type
            )}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">{toast.title}</p>

                {toast.description && (
                  <p className="mt-1 text-xs font-semibold opacity-80">
                    {toast.description}
                  </p>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-xs font-black opacity-60 transition hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}