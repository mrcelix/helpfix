import { useState } from 'react'
import { Plus, X, CheckCircle2 } from 'lucide-react'
import { useLang, pickLang} from '@/contexts/LangContext'
import { useFishboneCauses, useAddFishboneCause, useDeleteFishboneCause, useConfirmRootCause } from './useProblems'
import type { FishboneCategory } from '@/types/database'

const CATEGORIES: { key: FishboneCategory; label: { tr: string; en: string }; color: string }[] = [
  { key: 'people', label: { tr: 'İnsan', en: 'People' }, color: '#4C6FFF' },
  { key: 'process', label: { tr: 'Süreç', en: 'Process' }, color: '#F5A524' },
  { key: 'technology', label: { tr: 'Teknoloji', en: 'Technology' }, color: '#17B0A7' },
  { key: 'environment', label: { tr: 'Çevre', en: 'Environment' }, color: '#A78BFA' },
]

export function FishboneDiagram({ problemId, problemTitle }: { problemId: string; problemTitle: string }) {
  const { lang, t } = useLang()
  const { data: causes } = useFishboneCauses(problemId)
  const addCause = useAddFishboneCause(problemId)
  const deleteCause = useDeleteFishboneCause(problemId)
  const confirmRoot = useConfirmRootCause(problemId)
  const [draftFor, setDraftFor] = useState<FishboneCategory | null>(null)
  const [draftText, setDraftText] = useState('')

  function submitDraft() {
    if (!draftFor || !draftText.trim()) return
    addCause.mutate({ category: draftFor, description: draftText.trim() })
    setDraftText('')
    setDraftFor(null)
  }

  return (
    <div>
      {/* Dekoratif SVG iskelet — klasik Ishikawa (balık kılçığı) yapısı */}
      <svg viewBox="0 0 400 140" className="w-full h-auto mb-3" style={{ maxHeight: 140 }}>
        {/* Ana omurga */}
        <line x1="20" y1="70" x2="330" y2="70" stroke="var(--border)" strokeWidth="2" />
        <polygon points="330,62 350,70 330,78" fill="var(--border)" />
        {/* Etki kutusu */}
        <rect x="352" y="52" width="46" height="36" rx="6" fill="var(--panel-2)" stroke="var(--brand)" strokeWidth="1.5" />
        <text x="375" y="73" textAnchor="middle" fontSize="7" fill="var(--text)" fontWeight="700">
          {problemTitle.length > 14 ? problemTitle.slice(0, 12) + '…' : problemTitle}
        </text>
        {/* 4 kılçık kolu */}
        <line x1="70" y1="70" x2="110" y2="20" stroke={CATEGORIES[0].color} strokeWidth="1.5" />
        <line x1="150" y1="70" x2="190" y2="20" stroke={CATEGORIES[1].color} strokeWidth="1.5" />
        <line x1="150" y1="70" x2="190" y2="120" stroke={CATEGORIES[2].color} strokeWidth="1.5" />
        <line x1="70" y1="70" x2="110" y2="120" stroke={CATEGORIES[3].color} strokeWidth="1.5" />
      </svg>

      <div className="grid grid-cols-4 gap-2.5">
        {CATEGORIES.map((cat) => {
          const catCauses = causes?.filter((c) => c.category === cat.key) ?? []
          return (
            <div key={cat.key} className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
                <span className="text-[11px] font-bold">{pickLang(cat.label, lang)}</span>
              </div>
              <div className="space-y-1.5 mb-2">
                {catCauses.map((c) => (
                  <div
                    key={c.id}
                    className={`text-[10.5px] rounded-md px-2 py-1.5 flex items-start gap-1.5 ${c.is_confirmed_root_cause ? 'bg-brand text-white' : 'bg-[var(--panel)] border border-[var(--border)]'}`}
                  >
                    <span className="flex-1">{c.description}</span>
                    {!c.is_confirmed_root_cause && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => confirmRoot.mutate(c)} title={t({ tr: 'Kök neden olarak onayla', en: 'Confirm as root cause' })}>
                          <CheckCircle2 className="w-3 h-3 text-[var(--text-faint)] hover:text-ok" />
                        </button>
                        <button onClick={() => deleteCause.mutate(c.id)}>
                          <X className="w-3 h-3 text-[var(--text-faint)] hover:text-p1" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {draftFor === cat.key ? (
                <div className="flex gap-1">
                  <input
                    autoFocus
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitDraft()}
                    className="flex-1 bg-[var(--panel)] border border-[var(--border)] rounded-md px-1.5 py-1 text-[10.5px]"
                  />
                  <button onClick={submitDraft} className="text-[10px] font-bold px-1.5 rounded-md bg-brand text-white shrink-0">
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDraftFor(cat.key)}
                  className="w-full text-[10px] font-semibold text-[var(--text-faint)] flex items-center justify-center gap-1 py-1 rounded-md border border-dashed border-[var(--border)]"
                >
                  <Plus className="w-3 h-3" /> {t({ tr: 'Neden Ekle', en: 'Add Cause' })}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
