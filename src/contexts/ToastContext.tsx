import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

export interface Toast {
  id: string
  type: 'error' | 'success'
  message: string
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// Modül seviyesinde köprü: React Query'nin QueryClient'ı (main.tsx) React
// ağacının DIŞINDA oluşturuluyor, bu yüzden mutation hataları için
// doğrudan Context kullanamıyoruz. ToastProvider mount olduğunda kendini
// buraya kaydeder; main.tsx'teki MutationCache.onError bu fonksiyonu çağırır.
let globalShowToast: ((message: string, type?: Toast['type']) => void) | null = null

export function showGlobalToast(message: string, type: Toast['type'] = 'error') {
  globalShowToast?.(message, type)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: Toast['type'] = 'error') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  globalShowToast = showToast

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-[380px] w-full px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={
              'flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-2xl ' +
              (toast.type === 'error'
                ? 'bg-[var(--panel)] border-p1/50 text-[var(--text)]'
                : 'bg-[var(--panel)] border-ok/50 text-[var(--text)]')
            }
          >
            {toast.type === 'error' ? (
              <XCircle className="w-[18px] h-[18px] text-p1 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-[18px] h-[18px] text-ok shrink-0 mt-0.5" />
            )}
            <span className="text-[13px] flex-1 leading-snug">{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} className="shrink-0 text-[var(--text-faint)] hover:text-[var(--text)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast, ToastProvider içinde kullanılmalı')
  return ctx
}
