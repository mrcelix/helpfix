import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  widthClass?: string
}

export function Drawer({ open, onClose, title, subtitle, children, widthClass = 'w-[460px]' }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/55 backdrop-blur-[2px] z-40 transition-opacity',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed top-0 right-0 h-screen max-w-[94vw] bg-[var(--panel)] border-l border-[var(--border)] z-50 flex flex-col transition-transform duration-300',
          widthClass,
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-start gap-3 p-5 border-b border-[var(--border)]">
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold text-[15px] leading-tight">{title}</div>
            {subtitle && <div className="text-[11.5px] text-[var(--text-faint)] mt-1">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-faint)] hover:bg-[var(--row-hover)] hover:text-[var(--text)] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </>
  )
}
