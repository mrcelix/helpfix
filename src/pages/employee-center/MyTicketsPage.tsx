import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useLang, pickLang} from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { useMyRequests } from '@/pages/service-desk/useIncidents'
import { TicketDrawer } from '@/pages/service-desk/TicketDrawer'
import { NewTicketModal } from '@/pages/service-desk/NewTicketModal'
import { useOpenParam } from '@/hooks/useOpenParam'

function slaState(slaDueAt: string | null): 'ok' | 'warning' | 'breached' {
  if (!slaDueAt) return 'ok'
  const remainingMs = new Date(slaDueAt).getTime() - Date.now()
  if (remainingMs < 0) return 'breached'
  if (remainingMs < 4 * 3_600_000) return 'warning'
  return 'ok'
}
const SLA_STYLE: Record<string, string> = {
  ok: 'text-ok bg-[#0F2E1F]',
  warning: 'text-p2 bg-p2-tint',
  breached: 'text-p1 bg-p1-tint',
}
const SLA_LABEL: Record<string, { tr: string; en: string; fr?: string; it?: string; ar?: string }> = {
  ok: { tr: 'Zamanında', en: 'On Track', fr: 'Dans les délais', it: 'In tempo', ar: 'في الموعد' },
  warning: { tr: 'Riskte', en: 'At Risk', fr: 'À risque', it: 'A rischio', ar: 'معرض للخطر' },
  breached: { tr: 'Gecikti', en: 'Overdue', fr: 'En retard', it: 'In ritardo', ar: 'متأخر' },
}

export function MyTicketsPage() {
  const { lang, t } = useLang()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const { data: requests, isLoading, error } = useMyRequests()
  const openId = useOpenParam()
  useEffect(() => {
    if (openId) setSelectedId(openId)
  }, [openId])

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">{t({ tr: 'Taleplerim', en: 'My Tickets', fr: 'Mes tickets', it: 'I miei ticket', ar: 'طلباتي' })}</h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Oluşturduğunuz tüm talepler', en: 'All tickets you have created', fr: 'Tous les tickets que vous avez créés', it: 'Tutti i ticket che hai creato', ar: 'جميع الطلبات التي أنشأتها' })}
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="w-[15px] h-[15px]" />
          {t({ tr: 'Yeni Talep', en: 'New Ticket', fr: 'Nouveau ticket', it: 'Nuovo ticket', ar: 'طلب جديد' })}
        </Button>
      </div>

      {isLoading && <p className="text-[var(--text-faint)] text-sm py-8 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…', fr: 'Chargement…', it: 'Caricamento…', ar: 'جارٍ التحميل…' })}</p>}
      {error && <p className="text-p1 text-sm py-8 text-center">{t({ tr: 'Talepler yüklenemedi.', en: 'Failed to load tickets.' })}</p>}
      {!isLoading && !error && requests?.length === 0 && (
        <p className="text-[var(--text-faint)] text-sm py-14 text-center">
          {t({ tr: 'Henüz bir talebiniz yok.', en: "You haven't created any tickets yet.", fr: "Vous n'avez encore créé aucun ticket.", it: 'Non hai ancora creato alcun ticket.', ar: 'لم تقم بإنشاء أي طلبات بعد.' })}
        </p>
      )}

      <div className="space-y-2.5">
        {requests?.map((r) => {
          const isOpen = !['resolved', 'closed'].includes(r.status)
          const state = slaState(r.sla_due_at)
          return (
          <div
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setSelectedId(r.id)
              }
            }}
            className="flex items-center gap-3.5 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-4 py-3.5 cursor-pointer hover:border-brand transition-colors"
          >
            <PriorityBadge priority={r.priority} lang={lang} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[13.5px] truncate">{r.title}</div>
              <div className="text-[11px] text-[var(--text-faint)] font-mono">{r.ref}</div>
            </div>
            {isOpen && r.sla_due_at && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SLA_STYLE[state]}`}>
                {pickLang(SLA_LABEL[state], lang)}
              </span>
            )}
            <StatusBadge status={r.status} lang={lang} />
          </div>
          )
        })}
      </div>

      {selectedId && <TicketDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
      {showNewModal && <NewTicketModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}
