import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Ticket, CircleDot, GitBranch, BookOpen, LayoutGrid, Server } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useGlobalSearch, type SearchResult } from './useGlobalSearch'

const TYPE_ICON: Record<SearchResult['type'], typeof Ticket> = {
  incident: Ticket,
  problem: CircleDot,
  change: GitBranch,
  article: BookOpen,
  catalog_item: LayoutGrid,
  ci: Server,
}

const TYPE_LABEL: Record<SearchResult['type'], { tr: string; en: string }> = {
  incident: { tr: 'Olay', en: 'Incident' },
  problem: { tr: 'Problem', en: 'Problem' },
  change: { tr: 'Değişiklik', en: 'Change' },
  article: { tr: 'Makale', en: 'Article' },
  catalog_item: { tr: 'Hizmet', en: 'Service' },
  ci: { tr: 'Varlık', en: 'Asset' },
}

export function CommandPalette() {
  const { lang, t } = useLang()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { data: results, isLoading } = useGlobalSearch(query)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  function goTo(result: SearchResult) {
    navigate(result.path)
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-start justify-center pt-[12vh]" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-[560px] bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]">
          <Search className="w-[17px] h-[17px] text-[var(--text-faint)] shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t({ tr: 'Olay, problem, değişiklik, makale, hizmet veya varlık ara…', en: 'Search incidents, problems, changes, articles, services, or assets…' })}
            className="flex-1 bg-transparent outline-none text-[14px]"
          />
          <span className="text-[10px] font-mono font-bold bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-1.5 py-0.5 text-[var(--text-faint)] shrink-0">
            ESC
          </span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim().length < 2 && (
            <p className="text-[12px] text-[var(--text-faint)] text-center py-8">
              {t({ tr: 'Aramaya başlamak için en az 2 karakter yazın', en: 'Type at least 2 characters to search' })}
            </p>
          )}
          {query.trim().length >= 2 && isLoading && (
            <p className="text-[12px] text-[var(--text-faint)] text-center py-8">{t({ tr: 'Aranıyor…', en: 'Searching…' })}</p>
          )}
          {query.trim().length >= 2 && !isLoading && results?.length === 0 && (
            <p className="text-[12px] text-[var(--text-faint)] text-center py-8">{t({ tr: 'Sonuç bulunamadı.', en: 'No results found.' })}</p>
          )}
          {results?.map((r) => {
            const Icon = TYPE_ICON[r.type]
            return (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => goTo(r)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--row-hover)] text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--panel-2)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <Icon className="w-[15px] h-[15px] text-[var(--text-sub)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold truncate">{r.title}</div>
                  <div className="text-[10.5px] text-[var(--text-faint)]">
                    {TYPE_LABEL[r.type][lang]}
                    {r.ref && ` · ${r.ref}`}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="px-4 py-2 border-t border-[var(--border)] text-[10px] text-[var(--text-faint)] flex items-center gap-3">
          <span>⌘K / Ctrl+K {t({ tr: 'ile her yerden aç', en: 'to open from anywhere' })}</span>
        </div>
      </div>
    </div>
  )
}
