import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import Toast from '../components/Toast'

type ToastConfig = {
  message: string
  type: 'success' | 'error' | 'info'
  position?: 'top' | 'top-right' | 'bottom'
  duration?: number
}

type ToastContextValue = {
  showToast: (config: ToastConfig) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastConfig | null>(null)

  const showToast = useCallback((config: ToastConfig) => {
    setToast(config)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        visible={!!toast}
        message={toast?.message || ''}
        type={toast?.type || 'info'}
        position={toast?.position}
        duration={toast?.duration}
        onDismiss={() => setToast(null)}
      />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
