// Faz 1 (AI Derinleştirme) — Benzer Çözülmüş Kayıtlar
//
// TicketDrawer içinde, İlişkili Kayıtlar bölümünün hemen altında yaşar.
// Türkçe full-text (0061) ile aynı tenant'taki resolved/closed kayıtları
// benzerliğe göre listeler: agent geçmişte aynı sorunun nasıl çözüldüğünü
// tek bakışta görür; kopya şüphesi varsa mevcut Bağla/Birleştir akışını
// kullanabilir.

import { History } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { useSimilarIncidents } from './useAiEvents'

export function SimilarIncidentsSection({
  incidentId,
  onOpen,
}: {
  incidentId: string
  onOpen: (id: string) => void
}) {
  const { lang, t } = useLang()
  const { data: similar, isLoading } = useSimilarIncidents(incidentId)

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5">
        <History className="w-3 h-3 text-[var(--text-faint)]" />
        <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide">
          {t({
            tr: 'Benzer Çözülmüş Kayıtlar',
            en: 'Similar Resolved Records',
            fr: 'Enregistrements résolus similaires',
            it: 'Record risolti simili',
            ar: 'سجلات محلولة مشابهة',
          })}
        </div>
      </div>

      {isLoading && (
        <p className="text-[11.5px] text-[var(--text-faint)] italic">
          {t({ tr: 'Aranıyor…', en: 'Searching…' })}
        </p>
      )}

      {!isLoading && !similar?.length && (
        <p className="text-[11.5px] text-[var(--text-faint)] italic">
          {t({
            tr: 'Bu kayda benzeyen çözülmüş kayıt bulunamadı.',
            en: 'No similar resolved records found.',
          })}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {similar?.map((s) => (
          <button
            key={s.id}
            onClick={() => onOpen(s.id)}
            className="flex items-center gap-2 text-left px-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--panel-2)] hover:bg-[var(--row-hover)]"
          >
            <span className="font-mono text-[10px] text-[var(--text-faint)] shrink-0">{s.ref}</span>
            <span className="text-[11.5px] font-medium truncate flex-1">{s.title}</span>
            <PriorityBadge priority={s.priority} lang={lang} />
            <StatusBadge status={s.status} lang={lang} />
          </button>
        ))}
      </div>
    </div>
  )
}
