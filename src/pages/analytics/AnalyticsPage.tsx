import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLang } from '@/contexts/LangContext'
import { useWeeklyTrend, useSlaCompliance, useChangeSuccessRate, useOpenByPriority, useAvgFulfillmentDays } from './useAnalytics'

export function AnalyticsPage() {
  const { lang, t } = useLang()
  const { data: trend, isLoading: trendLoading } = useWeeklyTrend()
  const { data: sla } = useSlaCompliance()
  const { data: changeSuccess } = useChangeSuccessRate()
  const { data: priorityData, isLoading: priorityLoading } = useOpenByPriority()
  const { data: avgFulfillment } = useAvgFulfillmentDays()

  const chartTrend = trend?.map((p) => ({
    week: new Date(p.week_start).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' }),
    [t({ tr: 'Oluşturulan', en: 'Created' })]: p.created_count,
    [t({ tr: 'Çözülen', en: 'Resolved' })]: p.resolved_count,
  }))

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-[22px] font-bold tracking-tight">
          {t({ tr: 'Raporlama & Analitik', en: 'Reporting & Analytics' })}
        </h1>
        <p className="text-[13px] text-[var(--text-faint)] mt-1">
          {t({ tr: 'Tüm modüllerin gerçek zamanlı özeti', en: 'Real-time summary across all modules' })}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3.5 mb-6">
        <KpiCard
          label={t({ tr: 'SLA Uyumluluğu (30 gün)', en: 'SLA Compliance (30d)' })}
          value={`%${sla?.compliance_percent ?? 0}`}
          sub={`${sla?.breached_count ?? 0} / ${sla?.total_resolved ?? 0} ${t({ tr: 'ihlal', en: 'breached' })}`}
          color={Number(sla?.compliance_percent ?? 100) >= 90 ? 'text-ok' : 'text-p2'}
        />
        <KpiCard
          label={t({ tr: 'Değişiklik Başarı Oranı', en: 'Change Success Rate' })}
          value={`%${changeSuccess?.success_percent ?? 0}`}
          sub={`${changeSuccess?.successful_count ?? 0} / ${changeSuccess?.total_closed ?? 0}`}
          color="text-brand"
        />
        <KpiCard
          label={t({ tr: 'Ort. Karşılama Süresi', en: 'Avg. Fulfillment Time' })}
          value={`${avgFulfillment ?? 0} ${t({ tr: 'gün', en: 'days' })}`}
          color="text-purple"
        />
        <KpiCard
          label={t({ tr: 'Toplam Açık Kayıt', en: 'Total Open Records' })}
          value={String(priorityData?.reduce((s, p) => s + p.count, 0) ?? 0)}
          color="text-p2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5">
          <div className="text-[13px] font-bold mb-4">{t({ tr: 'Haftalık Olay Trendi', en: 'Weekly Incident Trend' })}</div>
          {trendLoading ? (
            <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartTrend}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4C6FFF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4C6FFF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#17B0A7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#17B0A7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey={t({ tr: 'Oluşturulan', en: 'Created' })} stroke="#4C6FFF" fill="url(#colorCreated)" strokeWidth={2} />
                <Area type="monotone" dataKey={t({ tr: 'Çözülen', en: 'Resolved' })} stroke="#17B0A7" fill="url(#colorResolved)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5">
          <div className="text-[13px] font-bold mb-4">{t({ tr: 'Önceliğe Göre Açık Kayıtlar', en: 'Open Records by Priority' })}</div>
          {priorityLoading ? (
            <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="priority" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {priorityData?.map((_, i) => (
                    <Cell key={i} fill={['#EF4444', '#F5A524', '#4C6FFF', '#8B95A8'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4">
      <div className={`font-display text-[22px] font-bold ${color}`}>{value}</div>
      <div className="text-[11px] text-[var(--text-faint)] mt-1">{label}</div>
      {sub && <div className="text-[10px] text-[var(--text-faint)] mt-0.5">{sub}</div>}
    </div>
  )
}
