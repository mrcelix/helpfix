import { useLang } from '@/contexts/LangContext'
import { computeSlaMeter } from '../useServiceDeskExtras'
import { useWallboardIncidents } from '../useWallboard'

export function SlaRiskWidget() {
  const { t } = useLang()
  const { data: incidents } = useWallboardIncidents()

  const slaRisk = (incidents ?? [])
    .filter((i) => i.sla_due_at)
    .map((i) => ({ incident: i, meter: computeSlaMeter(i.created_at, i.sla_due_at!) }))
    .sort((a, b) => {
      const aOver = a.meter.level === 'breached'
      const bOver = b.meter.level === 'breached'
      if (aOver !== bOver) return aOver ? -1 : 1
      return new Date(a.incident.sla_due_at!).getTime() - new Date(b.incident.sla_due_at!).getTime()
    })
    .slice(0, 12)

  return (
    <div className="h-full bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 overflow-y-auto">
      <div className="text-[16px] font-bold mb-4">{t({ tr: 'SLA Riski En Yüksek Kayıtlar', en: 'Highest SLA Risk Records' })}</div>
      {!slaRisk.length && (
        <p className="text-[14px] text-[var(--text-faint)] text-center py-12">
          {t({ tr: 'SLA riski taşıyan açık kayıt yok. 🎉', en: 'No open records at SLA risk. 🎉' })}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {slaRisk.map(({ incident, meter }) => (
          <div
            key={incident.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
              meter.level === 'breached'
                ? 'bg-p1-tint border-p1/50'
                : meter.level === 'danger'
                  ? 'bg-p1-tint/50 border-p1/30'
                  : meter.level === 'warn'
                    ? 'bg-p2-tint border-p2/30'
                    : 'bg-[var(--panel-2)] border-[var(--border)]'
            }`}
          >
            <span className="font-mono text-[11px] text-[var(--text-faint)] shrink-0">{incident.ref}</span>
            <span className="text-[13px] font-semibold flex-1 truncate">{incident.title}</span>
            <span className="text-[10.5px] font-bold text-[var(--text-faint)] shrink-0">{incident.assignee?.full_name ?? '—'}</span>
            <span
              className={`text-[11px] font-bold shrink-0 ${
                meter.level === 'breached' || meter.level === 'danger' ? 'text-p1' : meter.level === 'warn' ? 'text-p2' : 'text-[var(--text-faint)]'
              }`}
            >
              {meter.level === 'breached'
                ? t({ tr: `${meter.remainingLabel} ihlal`, en: `${meter.remainingLabel} overdue` })
                : t({ tr: `${meter.remainingLabel} kaldı`, en: `${meter.remainingLabel} left` })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
