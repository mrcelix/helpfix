import { useNavigate } from 'react-router-dom'
import { useLang, pickLang } from '@/contexts/LangContext'
import { useMyRequests } from '@/pages/service-desk/useIncidents'
import { StatusBadge } from '@/components/ui/Badge'

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
const SLA_LABEL: Record<string, { tr: string; en: string }> = {
  ok: { tr: 'Zamanında', en: 'On Track' },
  warning: { tr: 'Riskte', en: 'At Risk' },
  breached: { tr: 'Gecikti', en: 'Overdue' },
}

export function RecentTicketsWidget() {
  const { lang, t } = useLang()
  const navigate = useNavigate()
  const { data: myRequests, error: myRequestsError } = useMyRequests()

  return (
    <div className="h-full overflow-y-auto">
      {myRequestsError && (
        <p className="text-p1 text-[12px] mb-4">{t({ tr: 'Taleplerim yüklenemedi.', en: 'Failed to load my tickets.' })}</p>
      )}
      {!myRequestsError && (
        <div>
          <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
            {t({ tr: 'Son Taleplerim', en: 'My Recent Tickets', fr: 'Mes tickets récents', it: 'I miei ticket recenti', ar: 'طلباتي الأخيرة' })}
          </div>
          {!myRequests?.length && (
            <p className="text-[12px] text-[var(--text-faint)] italic">{t({ tr: 'Henüz talebiniz yok.', en: 'No tickets yet.' })}</p>
          )}
          <div className="space-y-1.5">
            {myRequests?.slice(0, 5).map((r) => {
              const isOpen = !['resolved', 'closed'].includes(r.status)
              const state = slaState(r.sla_due_at)
              return (
                <div
                  key={r.id}
                  onClick={() => navigate('/my-tickets')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate('/my-tickets')
                    }
                  }}
                  className="flex items-center gap-3 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-4 py-3 cursor-pointer hover:border-brand"
                >
                  <span className="font-semibold text-[13px] flex-1 truncate">{r.title}</span>
                  <span className="font-mono text-[11px] text-[var(--text-faint)]">{r.ref}</span>
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
        </div>
      )}
    </div>
  )
}
