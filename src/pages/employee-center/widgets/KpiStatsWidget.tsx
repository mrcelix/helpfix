import { useMemo } from 'react'
import { useLang } from '@/contexts/LangContext'
import { useMyRequests } from '@/pages/service-desk/useIncidents'

export function KpiStatsWidget() {
  const { t } = useLang()
  const { data: myRequests } = useMyRequests()

  const openCount = myRequests?.filter((r) => !['resolved', 'closed'].includes(r.status)).length ?? 0
  const resolvedCount = myRequests?.filter((r) => ['resolved', 'closed'].includes(r.status)).length ?? 0

  const avgResolutionDays = useMemo(() => {
    const resolved = myRequests?.filter((r) => r.resolved_at) ?? []
    if (!resolved.length) return null
    const total = resolved.reduce((sum, r) => sum + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()) / 86_400_000, 0)
    return Math.round((total / resolved.length) * 10) / 10
  }, [myRequests])

  return (
    <div className="h-full grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 hover:border-brand/40 transition-colors">
        <div className="font-display text-2xl font-bold">{openCount}</div>
        <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Açık Talebim', en: 'Open Tickets', fr: 'Tickets ouverts', it: 'Ticket aperti', ar: 'الطلبات المفتوحة' })}</div>
      </div>
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 hover:border-ok/40 transition-colors">
        <div className="font-display text-2xl font-bold text-ok">{resolvedCount}</div>
        <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Çözülen Talebim', en: 'Resolved Tickets', fr: 'Tickets résolus', it: 'Ticket risolti', ar: 'الطلبات المحلولة' })}</div>
      </div>
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 hover:border-brand/40 transition-colors">
        <div className="font-display text-2xl font-bold">{myRequests?.length ?? 0}</div>
        <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Toplam Talep', en: 'Total Tickets', fr: 'Total des tickets', it: 'Ticket totali', ar: 'إجمالي الطلبات' })}</div>
      </div>
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 hover:border-brand/40 transition-colors">
        <div className="font-display text-2xl font-bold text-brand">
          {avgResolutionDays != null ? `${avgResolutionDays}${t({ tr: ' gün', en: 'd', fr: ' j', it: ' gg', ar: ' يوم' })}` : '—'}
        </div>
        <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Ort. Çözüm Süreniz', en: 'Avg. Resolution Time', fr: 'Délai de résolution moyen', it: 'Tempo medio di risoluzione', ar: 'متوسط وقت الحل' })}</div>
      </div>
    </div>
  )
}
