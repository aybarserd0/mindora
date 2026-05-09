'use client'

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'
type MindoraNotificationPermission =
  | NotificationPermission
  | 'unsupported'
  | 'unknown'

type ToastItem = {
  id: string
  title: string
  description?: string
  type: ToastType
  createdAt: number
}

type ShowToastOptions = {
  browserNotification?: boolean
  notificationTitle?: string
  notificationBody?: string
  durationMs?: number
  requirePermissionFirst?: boolean
}

type ToastContextType = {
  showToast: (
    title: string,
    description?: string,
    type?: ToastType,
    options?: ShowToastOptions
  ) => void
  requestNotificationPermission: () => Promise<
    NotificationPermission | 'unsupported'
  >
  notificationPermission: MindoraNotificationPermission
  notificationsSupported: boolean
  notificationsEnabled: boolean
}

const ToastContext = createContext<ToastContextType | null>(null)

const DEFAULT_DURATION_MS = 4500
const MAX_TOASTS = 4

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

  if (type === 'warning') {
    return 'border-orange-100 bg-orange-50 text-orange-900'
  }

  return 'border-black/10 bg-white text-[#171717]'
}

function getToastIcon(type: ToastType) {
  if (type === 'success') return '✓'
  if (type === 'error') return '!'
  if (type === 'warning') return '!'
  return 'i'
}

function createSafeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function canUseNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [notificationPermission, setNotificationPermission] =
    useState<MindoraNotificationPermission>('unknown')

  const timeoutMap = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const notificationsSupported = canUseNotifications()
  const notificationsEnabled = notificationPermission === 'granted'

  useEffect(() => {
    if (!canUseNotifications()) {
      setNotificationPermission('unsupported')
      return
    }

    setNotificationPermission(Notification.permission)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))

    if (timeoutMap.current[id]) {
      clearTimeout(timeoutMap.current[id])
      delete timeoutMap.current[id]
    }
  }, [])

  const requestNotificationPermission = useCallback(async () => {
    if (!canUseNotifications()) {
      setNotificationPermission('unsupported')
      return 'unsupported'
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      return permission
    } catch (err) {
      console.error('NOTIFICATION PERMISSION ERROR:', err)
      setNotificationPermission(Notification.permission)
      return Notification.permission
    }
  }, [])

  const sendBrowserNotification = useCallback(
    ({
      title,
      body,
      requirePermissionFirst,
    }: {
      title: string
      body?: string
      requirePermissionFirst?: boolean
    }) => {
      if (!canUseNotifications()) {
        setNotificationPermission('unsupported')
        return
      }

      const permission = Notification.permission
      setNotificationPermission(permission)

      if (permission !== 'granted') {
        if (!requirePermissionFirst) return
        return
      }

      try {
        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'mindora-chat-notification',
          silent: false,
        })

        notification.onclick = () => {
          try {
            window.focus()
            notification.close()
          } catch {
            notification.close()
          }
        }
      } catch (err) {
        console.error('BROWSER NOTIFICATION ERROR:', err)
      }
    },
    []
  )

  const showToast = useCallback(
    (
      title: string,
      description?: string,
      type: ToastType = 'info',
      options?: ShowToastOptions
    ) => {
      const id = createSafeId()

      const toast: ToastItem = {
        id,
        title,
        description,
        type,
        createdAt: Date.now(),
      }

      setToasts((current) => {
        const next = [...current, toast]
        return next.slice(-MAX_TOASTS)
      })

      timeoutMap.current[id] = setTimeout(() => {
        removeToast(id)
      }, options?.durationMs ?? DEFAULT_DURATION_MS)

      if (options?.browserNotification) {
        sendBrowserNotification({
          title: options.notificationTitle || title,
          body: options.notificationBody || description,
          requirePermissionFirst: options.requirePermissionFirst,
        })
      }
    },
    [removeToast, sendBrowserNotification]
  )

  useEffect(() => {
    return () => {
      Object.values(timeoutMap.current).forEach(clearTimeout)
      timeoutMap.current = {}
    }
  }, [])

  const value = useMemo(
    () => ({
      showToast,
      requestNotificationPermission,
      notificationPermission,
      notificationsSupported,
      notificationsEnabled,
    }),
    [
      showToast,
      requestNotificationPermission,
      notificationPermission,
      notificationsSupported,
      notificationsEnabled,
    ]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-full max-w-sm flex-col gap-3 px-2 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            className={`pointer-events-auto overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur transition-all duration-300 animate-in slide-in-from-top-3 ${getToastClasses(
              toast.type
            )}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-black">
                {getToastIcon(toast.type)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">{toast.title}</p>

                {toast.description && (
                  <p className="mt-1 text-xs font-semibold leading-5 opacity-80">
                    {toast.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-full px-2 py-1 text-xs font-black opacity-60 transition hover:bg-black/5 hover:opacity-100"
                aria-label="Bildirimi kapat"
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