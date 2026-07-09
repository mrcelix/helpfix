import { useState } from 'react'
import { Link2, Plus, X, Search } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import {
  useIncidentLinks,
  useSearchIncidentsToLink,
  useCreateIncidentLink,
  useDeleteIncidentLink,
  type IncidentLinkType,
} from './useIncidents'

const LINK_TYPE_LABEL: Record<IncidentLinkType, { tr: string; en: string }> = {
  related_to: { tr: 'İlgili', en: 'Related to' },
  duplicate_of: { tr: 'Kopyası', en: 'Duplicate of' },
  caused_by: { tr: 'Tarafından tetiklendi', en: 'Caused by' },
}
// Ters yön etiketleri (bu kayıt hedef tarafta olduğunda)
const LINK_TYPE_LABEL_REVERSE: Record<IncidentLinkType, { tr: string; en: string }> = {
  related_to: { tr: 'İlgili', en: 'Related to' },
  duplicate_of: { tr: 'Kopyası bu', en: 'Has duplicate' },
  caused_by: { tr: 'Bunu tetikledi (çocuk olay)', en: 'Triggered this (child incident)' },
}

export function LinkedIncidentsSection({ incidentId, onOpen }: { incidentId: string; onOpen: (id: string) => void }) {
  const { lang, t } = useLang()
  const { data: links } = useIncidentLinks(incidentId)
  const createLink = useCreateIncidentLink()
  const deleteLink = useDeleteIncidentLink()

  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')
  const [linkType, setLinkType] = useState<IncidentLinkType>('related_to')
  const { data: matches } = useSearchIncidentsToLink(query, incidentId)

  function addLink(targetId: string) {
    createLink.mutate({ incidentId, linkedIncidentId: targetId, linkType })
    setPicking(false)
    setQuery('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide">
          {t({ tr: 'İlişkili Kayıtlar', en: 'Linked Records' })}
        </div>
        <button
          onClick={() => setPicking((p) => !p)}
          className="flex items-center gap-1 text-[11px] font-bold text-brand-dim"
        >
          <Plus className="w-3 h-3" />
          {t({ tr: 'Bağla', en: 'Link' })}
        </button>
      </div>

      {picking && (
        <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-2.5 mb-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            {(['related_to', 'duplicate_of', 'caused_by'] as IncidentLinkType[]).map((lt) => (
              <button
                key={lt}
                onClick={() => setLinkType(lt)}
                className={
                  'text-[10.5px] font-bold px-2 py-1 rounded-md border ' +
                  (linkType === lt ? 'bg-brand border-brand text-white' : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-faint)]')
                }
              >
                {LINK_TYPE_LABEL[lt][lang]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 bg-[var(--panel)] border border-[var(--border)] rounded-md px-2 py-1.5 mb-1.5">
            <Search className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t({ tr: 'Ref veya başlıkla ara…', en: 'Search by ref or title…' })}
              className="flex-1 bg-transparent outline-none text-[12px]"
            />
          </div>
          <div className="max-h-[140px] overflow-y-auto flex flex-col gap-1">
            {matches?.map((m) => (
              <button
                key={m.id}
                onClick={() => addLink(m.id)}
                className="flex items-center gap-2 text-left px-2 py-1.5 rounded-md hover:bg-[var(--row-hover)]"
              >
                <span className="font-mono text-[10px] text-[var(--text-faint)] shrink-0">{m.ref}</span>
                <span className="text-[11.5px] font-medium truncate">{m.title}</span>
              </button>
            ))}
            {query.trim().length >= 2 && !matches?.length && (
              <div className="text-[11px] text-[var(--text-faint)] italic px-2 py-1.5">
                {t({ tr: 'Eşleşme yok', en: 'No matches' })}
              </div>
            )}
          </div>
        </div>
      )}

      {!links?.length && !picking && (
        <p className="text-[11.5px] text-[var(--text-faint)] italic">{t({ tr: 'Henüz ilişkili kayıt yok.', en: 'No linked records yet.' })}</p>
      )}

      <div className="flex flex-col gap-1.5">
        {links?.map((l) => (
          <div
            key={l.id}
            className="flex items-center gap-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2"
          >
            <Link2 className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
            <button onClick={() => onOpen(l.other.id)} className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-[var(--text-faint)]">{l.other.ref}</span>
                <PriorityBadge priority={l.other.priority} lang={lang} />
                <StatusBadge status={l.other.status} lang={lang} />
              </div>
              <div className="text-[12px] font-medium truncate mt-0.5">{l.other.title}</div>
            </button>
            <span className="text-[10px] font-bold text-[var(--text-faint)] shrink-0 max-w-[90px] text-right">
              {(l.isSourceSide ? LINK_TYPE_LABEL : LINK_TYPE_LABEL_REVERSE)[l.link_type][lang]}
            </span>
            <button onClick={() => deleteLink.mutate(l.id)} className="shrink-0 text-[var(--text-faint)] hover:text-p1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
