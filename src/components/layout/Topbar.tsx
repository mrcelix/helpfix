import { Search, Sun, Moon, Bell } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

export function Topbar({ crumb }: { crumb: string }) {
  const { lang, setLang, t } = useLang()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="h-[60px] border-b border-[var(--border)] flex items-center gap-4 px-6 sticky top-0 bg-[var(--bg)] z-20">
      <div className="text-xs text-[var(--text-faint)]">
        <span>HelpFix</span> / <b className="text-[var(--text)] font-semibold">{crumb}</b>
      </div>

      <div className="flex-1 max-w-[380px] flex items-center gap-2 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-1.5 ml-3">
        <Search className="w-[15px] h-[15px] text-[var(--text-faint)] shrink-0" />
        <input
          type="text"
          placeholder={t({ tr: 'Ara…', en: 'Search…' })}
          className="bg-transparent outline-none text-[13px] w-full placeholder:text-[var(--text-faint)]"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex border border-[var(--border)] rounded-lg overflow-hidden text-[11.5px] font-semibold">
          {(['tr', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                'px-2.5 py-1.5',
                lang === l ? 'bg-brand text-white' : 'text-[var(--text-faint)]'
              )}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={toggleTheme}
          className="w-[34px] h-[34px] rounded-lg border border-[var(--border)] bg-[var(--panel)] flex items-center justify-center text-[var(--text-sub)]"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          className="relative w-[34px] h-[34px] rounded-lg border border-[var(--border)] bg-[var(--panel)] flex items-center justify-center text-[var(--text-sub)]"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-p1 border-[1.5px] border-[var(--bg)]" />
        </button>
      </div>
    </header>
  )
}
