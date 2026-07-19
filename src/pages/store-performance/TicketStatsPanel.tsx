import { ArrowUp, ArrowDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLang } from '@/contexts/LangContext'
import { useStoreTicketStats, type StorePeriod } from './useStorePerformance'

const STATUS_LABEL: Record<string, { tr: string; en: string }> = {
  status_new: { tr: 'Yeni', en: 'New' },
  status_open: { tr: 'Açık', en: 'Open' },
  status_in_progress: { tr: 'İşlemde', en: 'In Progress' },
  status_on_hold: { tr: 'Beklemede', en: 'On Hold' },
  status_resolved: { tr: 'Çözüldü', en: 'Resolved' },
  status_closed: { tr: 'Kapalı', en: 'Closed' },
  status_merged: { tr: 'Birleştirildi', en: 'Merged' },
}

/** `increaseIsGood`: "Açılan" için artış kötüdür (kırmızı); "Çözülen" için
 * artış iyidir (yeşil) — ok yönü her zaman gerçek artış/azalışı gösterir,
 * ama RENK bu iki metrikte TERS anlam taşır, o yüzden dışarıdan verilir. */
function TrendBadge({
  current,
  previous,
  increaseIsGood,
  t,
}: {
  current: number
  previous: number
  increaseIsGood: boolean
  t: (d: { tr: string; en: string }) => string
}) {
  const diff = current - previous
  if (diff === 0) return null
  const up = diff > 0
  const isGood = up === increaseIsGood
  return (
    <span
      className={`flex items-center gap-0.5 text-[10px] font-bold rounded-full px-1.5 py-0.5 ${isGood ? 'bg-ok/15 text-ok' : 'bg-p1-tint text-p1'}`}
      title={t({ tr: 'Önceki periyoda göre', en: 'vs previous period' })}
    >
      {up ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {Math.abs(diff)}
    </span>
  )
}

/** Mağaza çağrı istatistikleri: status/priority kırılımı, MTTR, önceki
 * periyot karşılaştırması. StoreDetailDrawer (mağaza detayı) ve
 * HealthPillarModal'ın (Yardım Masası sütunu) PAYLAŞTIĞI panel — kendi
 * verisini kendi çeker (siteId+period yeterli), dışarıdan veri beklemez. */
export function TicketStatsPanel({ siteId, period }: { siteId: string; period: StorePeriod }) {
  const { t } = useLang()
  const { data: ticketStats, isLoading } = useStoreTicketStats(siteId, period)

  if (isLoading) {
    return <p className="text-[12px] text-[var(--text-faint)] py-6 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
  }
  if (!ticketStats) return null

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-display text-xl font-bold">{ticketStats.opened_count}</span>
            <TrendBadge current={ticketStats.opened_count} previous={ticketStats.prev_period_opened} increaseIsGood={false} t={t} />
          </div>
          <div className="text-[10px] text-[var(--text-faint)] mt-1">{t({ tr: 'Açılan', en: 'Opened' })}</div>
        </div>
        <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-display text-xl font-bold">{ticketStats.resolved_count}</span>
            <TrendBadge current={ticketStats.resolved_count} previous={ticketStats.prev_period_resolved} increaseIsGood={true} t={t} />
          </div>
          <div className="text-[10px] text-[var(--text-faint)] mt-1">{t({ tr: 'Çözülen', en: 'Resolved' })}</div>
        </div>
      </div>
      {ticketStats.avg_resolution_hours != null && (
        <p className="text-[11px] text-[var(--text-faint)] mb-3">
          {t({ tr: 'Ort. çözüm süresi', en: 'Avg. resolution time' })}:{' '}
          <b className="text-[var(--text-sub)]">
            {ticketStats.avg_resolution_hours} {t({ tr: 'saat', en: 'hours' })}
          </b>
        </p>
      )}
      <ResponsiveContainer width="100%" height={110}>
        <BarChart
          data={[
            { key: 'status_new', count: ticketStats.status_new },
            { key: 'status_open', count: ticketStats.status_open },
            { key: 'status_in_progress', count: ticketStats.status_in_progress },
            { key: 'status_on_hold', count: ticketStats.status_on_hold },
            { key: 'status_resolved', count: ticketStats.status_resolved },
            { key: 'status_closed', count: ticketStats.status_closed },
          ].map((d) => ({ ...d, label: t(STATUS_LABEL[d.key]) }))}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-faint)' }} interval={0} angle={-20} textAnchor="end" height={40} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} allowDecimals={false} width={20} />
          <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey="count" fill="#4C6FFF" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <span className="text-[9.5px] font-bold bg-p1-tint text-p1 rounded-full px-1.5 py-0.5">P1 · {ticketStats.priority_p1}</span>
        <span className="text-[9.5px] font-bold bg-p2-tint text-p2 rounded-full px-1.5 py-0.5">P2 · {ticketStats.priority_p2}</span>
        <span className="text-[9.5px] font-bold bg-brand-tint text-brand-dim rounded-full px-1.5 py-0.5">P3 · {ticketStats.priority_p3}</span>
        <span className="text-[9.5px] font-bold bg-[var(--panel-2)] text-[var(--text-faint)] rounded-full px-1.5 py-0.5">P4 · {ticketStats.priority_p4}</span>
      </div>
    </div>
  )
}
