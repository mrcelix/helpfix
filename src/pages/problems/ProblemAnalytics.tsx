import { AreaChart, Area, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useLang } from '@/contexts/LangContext'
import { useRootCauseBreakdown, useProblemWeeklyTrend, useAvgProblemResolutionDays } from './useProblems'

const CATEGORY_LABEL: Record<string, { tr: string; en: string }> = {
  people: { tr: 'İnsan', en: 'People' },
  process: { tr: 'Süreç', en: 'Process' },
  technology: { tr: 'Teknoloji', en: 'Technology' },
  environment: { tr: 'Çevre', en: 'Environment' },
}
const CATEGORY_COLORS: Record<string, string> = {
  people: '#4C6FFF',
  process: '#F5A524',
  technology: '#17B0A7',
  environment: '#A78BFA',
}

export function ProblemAnalytics() {
  const { lang, t } = useLang()
  const { data: breakdown, isLoading: breakdownLoading } = useRootCauseBreakdown()
  const { data: trend, isLoading: trendLoading } = useProblemWeeklyTrend()
  const { data: avgDays } = useAvgProblemResolutionDays()

  const pieData = breakdown?.map((b) => ({ name: CATEGORY_LABEL[b.category]?.[lang] ?? b.category, value: b.confirmed_count, key: b.category }))
  const chartTrend = trend?.map((p) => ({
    week: new Date(p.week_start).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' }),
    [t({ tr: 'Açılan', en: 'Opened' })]: p.created_count,
    [t({ tr: 'Çözülen', en: 'Resolved' })]: p.resolved_count,
  }))

  return (
    <div>
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4 mb-4 inline-block">
        <div className="font-display text-2xl font-bold text-brand">{avgDays ?? 0} {t({ tr: 'gün', en: 'days' })}</div>
        <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Ortalama Kök Neden Çözüm Süresi', en: 'Avg. Root Cause Resolution Time' })}</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5">
          <div className="text-[13px] font-bold mb-4">{t({ tr: 'Kök Neden Kategori Dağılımı', en: 'Root Cause Category Breakdown' })}</div>
          {breakdownLoading ? (
            <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
          ) : !pieData?.length ? (
            <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Henüz onaylanmış kök neden yok.', en: 'No confirmed root causes yet.' })}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={{ fontSize: 11 }}>
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[d.key]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5">
          <div className="text-[13px] font-bold mb-4">{t({ tr: 'Haftalık Problem Trendi', en: 'Weekly Problem Trend' })}</div>
          {trendLoading ? (
            <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartTrend}>
                <defs>
                  <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5A524" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F5A524" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResolvedP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#17B0A7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#17B0A7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey={t({ tr: 'Açılan', en: 'Opened' })} stroke="#F5A524" fill="url(#colorOpened)" strokeWidth={2} />
                <Area type="monotone" dataKey={t({ tr: 'Çözülen', en: 'Resolved' })} stroke="#17B0A7" fill="url(#colorResolvedP)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
