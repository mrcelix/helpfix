import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLang } from '@/contexts/LangContext'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  widthClass?: string
}

export function Modal({ open, onClose, title, children, footer, widthClass = 'max-w-[520px]' }: ModalProps) {
  const { t } = useLang()
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={cn('w-full bg-[var(--panel)] border border-[var(--border)] rounded-2xl flex flex-col max-h-[88vh]', widthClass)}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-display font-bold text-base">{title}</h3>
          <button
            onClick={onClose}
            title={t({ tr: 'Kapat', en: 'Close' })}
            aria-label={t({ tr: 'Kapat', en: 'Close' })}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-faint)] hover:bg-[var(--row-hover)] hover:text-[var(--text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-[var(--border)] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
