import { useState, useRef, useEffect } from 'react'
import { Globe, Check } from 'lucide-react'
import { useLang, SUPPORTED_LANGS } from '@/contexts/LangContext'
import { cn } from '@/lib/utils'

/** Topbar'daki dil seçici — TR/EN/FR/IT/AR arasında geçiş yapar.
 * Önceden sadece TR/EN buton çifti vardı; 5 dile çıkınca dropdown'a
 * dönüştürüldü. Seçili dil kısaltması (TR, EN, FR, IT, AR) her zaman
 * görünür, açılınca tüm diller yerel adlarıyla listelenir. */
export function LanguageSwitcher({ alwaysVisible = false }: { alwaysVisible?: boolean } = {}) {
  const { lang, setLang } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className={cn('relative', !alwaysVisible && 'hidden sm:block')}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-[34px] px-2.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[11.5px] font-bold text-[var(--text-sub)] hover:border-brand/40"
        aria-label="Language"
      >
        <Globe className="w-3.5 h-3.5" />
        {lang.toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-44 bg-[var(--panel)] border border-[var(--border)] rounded-xl shadow-lg py-1.5 z-50">
          {SUPPORTED_LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code)
                setOpen(false)
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-[13px] text-left hover:bg-[var(--row-hover)]',
                lang === l.code ? 'font-bold text-brand-dim' : 'text-[var(--text-sub)]'
              )}
            >
              <span>{l.nativeLabel}</span>
              {lang === l.code && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
