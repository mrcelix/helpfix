import { Wifi, WifiOff, ArrowUp, ArrowDown } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Drawer } from '@/components/ui/Drawer'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { useLang } from '@/contexts/LangContext'
import {
  useStoreDevices,
  useStoreIncidents,
  useStoreScoreHistory,
  useStoreTicketStats,
  scoreLevel,
  type StoreScorecard,
  type StorePeriod,
} from './useStorePerformance'
import type { Priority, TicketStatus } from '@/types/database'

const STATUS_LABEL: Record<string, { tr: string; en: string }> = {
  status_new: { tr: 'Yeni', en: 'New' },
  status_open: { tr: 'Açık', en: 'Open' },
  status_in_progress: { tr: 'İşlemde', en: 'In Progress' },
  status_on_hold: { tr: 'Beklemede', en: 'On Hold' },
  status_resolved: { tr: 'Çözüldü', en: 'Resolved' },
  status_closed: { tr: 'Kapalı', en: 'Closed' },
  status_merged: { tr: 'Birleştirildi', en: 'Merged' },
}

function TrendBadge({ current, previous, t }: { current: number; previous: number; t: (d: { tr: string; en: string }) => string }) {
  const diff = current - previous
  if (diff === 0) return null
  const up = diff > 0
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-bold rounded-full px-1.5 py-0.5 ${up ? 'bg-p1-tint text-p1' : 'bg-ok/15 text-ok'}`} title={t({ tr: 'Önceki periyoda göre', en: 'vs previous period' })}>
      {up ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {Math.abs(diff)}
    </span>
  )
}

export function StoreDetailDrawer({ store, period, onClose }: { store: StoreScorecard; period: StorePeriod; onClose: () => void }) {
  const { lang, t } = useLang()
  const { data: devices } = useStoreDevices(store.site_id)
  const { data: incidents } = useStoreIncidents(store.site_id)
  const { data: history } = useStoreScoreHistory(store.site_id, 30)
  const { data: ticketStats } = useStoreTicketStats(store.site_id, period)

  const level = scoreLevel(store.score)
  const levelColor = level === 'good' ? 'text-ok' : level === 'warn' ? 'text-p2' : 'text-p1'

  const chartData = history?.map((h) => ({
    date: new Date(h.snapshot_date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' }),
    [t({ tr: 'Skor', en: 'Score' })]: h.score,
  }))

  return (
    <Drawer open onClose={onClose} title={store.site_name} subtitle={t({ tr: 'Mağaza Performans Detayı', en: 'Store Performance Detail' })} widthClass="w-[460px]">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3.5 text-center">
            <div className={`font-display text-3xl font-bold ${levelColor}`}>{store.score}</div>
            <div className="text-[10.5px] text-[var(--text-faint)] mt-1">{t({ tr: 'Genel Skor', en: 'Overall Score' })}</div>
          </div>
          <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3.5 text-center">
            <div className="font-display text-3xl font-bold text-brand-dim">%{store.sla_compliant_pct}</div>
            <div className="text-[10.5px] text-[var(--text-faint)] mt-1">{t({ tr: 'SLA Uyumu (30g)', en: 'SLA Compliance (30d)' })}</div>
          </div>
        </div>

        {!!chartData?.length && (
          <div>
            <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2">
              {t({ tr: 'Skor Trendi (30 gün)', en: 'Score Trend (30d)' })}
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-faint)' }} width={24} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey={t({ tr: 'Skor', en: 'Score' })} stroke="#17B0A7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {!chartData?.length && (
          <p className="text-[11px] text-[var(--text-faint)] italic">
            {t({
              tr: 'Henüz geçmiş anlık görüntü yok — Mağaza Performansı > Geçmiş sekmesinden bir anlık görüntü alın.',
              en: 'No historical snapshots yet — take one from the Store Performance > History tab.',
            })}
          </p>
        )}

        {ticketStats && (
          <div>
            <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2">
              {t({ tr: 'Çağrılar (seçili periyot)', en: 'Calls (selected period)' })}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="font-display text-xl font-bold">{ticketStats.opened_count}</span>
                  <TrendBadge current={ticketStats.opened_count} previous={ticketStats.prev_period_opened} t={t} />
                </div>
                <div className="text-[10px] text-[var(--text-faint)] mt-1">{t({ tr: 'Açılan', en: 'Opened' })}</div>
              </div>
              <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="font-display text-xl font-bold">{ticketStats.resolved_count}</span>
                  <TrendBadge current={ticketStats.resolved_count} previous={ticketStats.prev_period_resolved} t={t} />
                </div>
                <div className="text-[10px] text-[var(--text-faint)] mt-1">{t({ tr: 'Çözülen', en: 'Resolved' })}</div>
              </div>
            </div>
            {ticketStats.avg_resolution_hours != null && (
              <p className="text-[11px] text-[var(--text-faint)] mb-3">
                {t({ tr: 'Ort. çözüm süresi', en: 'Avg. resolution time' })}: <b className="text-[var(--text-sub)]">{ticketStats.avg_resolution_hours} {t({ tr: 'saat', en: 'hours' })}</b>
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
        )}

        <div>
          <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2">
            {t({ tr: `Envanter (${store.online_devices}/${store.total_devices} online)`, en: `Inventory (${store.online_devices}/${store.total_devices} online)` })}
          </div>
          <div className="flex flex-col gap-1">
            {!devices?.length && <p className="text-[11px] text-[var(--text-faint)] italic">{t({ tr: 'Bu siteye bağlı cihaz yok.', en: 'No devices linked to this site.' })}</p>}
            {devices?.map((d) => (
              <div key={d.id} className="flex items-center gap-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2">
                {d.is_online ? <Wifi className="w-3.5 h-3.5 text-ok shrink-0" /> : <WifiOff className="w-3.5 h-3.5 text-p1 shrink-0" />}
                <span className="font-mono text-[10.5px] text-[var(--text-faint)] shrink-0">{d.tag}</span>
                <span className="text-[12px] font-medium truncate flex-1">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2">
            {t({ tr: 'Son Kayıtlar', en: 'Recent Records' })}
          </div>
          <div className="flex flex-col gap-1">
            {!incidents?.length && <p className="text-[11px] text-[var(--text-faint)] italic">{t({ tr: 'Bu siteden kayıt yok.', en: 'No records from this site.' })}</p>}
            {incidents?.map((i) => (
              <div key={i.id} className="flex items-center gap-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2">
                <PriorityBadge priority={i.priority as Priority} lang={lang} />
                <span className="text-[12px] font-medium truncate flex-1">{i.title}</span>
                <StatusBadge status={i.status as TicketStatus} lang={lang} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  )
}
