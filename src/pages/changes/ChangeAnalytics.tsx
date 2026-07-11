import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useLang, pickLang } from '@/contexts/LangContext'
import { useChangeRiskDistribution, useApprovalBottleneck, useChangeSuccessTrend } from './useChanges'

const BUCKET_LABEL: Record<string, { tr: string; en: string }> = {
  low: { tr: 'Düşük (0-30)', en: 'Low (0-30)' },
  medium: { tr: 'Orta (31-60)', en: 'Medium (31-60)' },
  high: { tr: 'Yüksek (61-100)', en: 'High (61-100)' },
}
const BUCKET_COLOR: Record<string, string> = { low: '#22C55E', medium: '#F5A524', high: '#EF4444' }

const APPROVAL_LABEL: Record<string, { tr: string; en: string }> = {
  technical_review: { tr: 'Teknik İnceleme', en: 'Technical Review' },
  cab: { tr: 'CAB', en: 'CAB' },
}

export function ChangeAnalytics() {
  const { lang, t } = useLang()
  const { data: riskDist, isLoading: riskLoading } = useChangeRiskDistribution()
  const { data: bottleneck } = useApprovalBottleneck()
  const { data: trend, isLoading: trendLoading } = useChangeSuccessTrend()

  const riskData = riskDist?.map((r) => ({ bucket: (BUCKET_LABEL[r.bucket] ? pickLang(BUCKET_LABEL[r.bucket], lang) : undefined) ?? r.bucket, count: r.change_count, key: r.bucket }))
  const chartTrend = trend?.map((p) => ({
    week: new Date(p.week_start).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' }),
    [t({ tr: 'Başarılı', en: 'Successful' })]: p.successful_count,
    [t({ tr: 'Başarısız', en: 'Failed' })]: p.failed_count,
  }))

  return (
    <div>
      {!!bottleneck?.length && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {bottleneck.map((b) => (
            <div key={b.approval_type} className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-3.5">
              <div className="font-display text-xl font-bold text-p2">{b.avg_wait_hours} {t({ tr: 'saat', en: 'hours' })}</div>
              <div className="text-[11px] text-[var(--text-faint)] mt-1">
                {(APPROVAL_LABEL[b.approval_type] ? pickLang(APPROVAL_LABEL[b.approval_type], lang) : undefined)} — {t({ tr: 'ortalama onay bekleme süresi', en: 'avg. approval wait time' })} ({b.decided_count})
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5">
          <div className="text-[13px] font-bold mb-4">{t({ tr: 'Risk Dağılımı', en: 'Risk Distribution' })}</div>
          {riskLoading ? (
            <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
          ) : !riskData?.length ? (
            <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Henüz veri yok.', en: 'No data yet.' })}</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10.5, fill: 'var(--text-faint)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {riskData.map((d, i) => (
                    <Cell key={i} fill={BUCKET_COLOR[d.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5">
          <div className="text-[13px] font-bold mb-4">{t({ tr: 'Haftalık Başarı Trendi', en: 'Weekly Success Trend' })}</div>
          {trendLoading ? (
            <p className="text-[var(--text-faint)] text-sm py-16 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartTrend}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey={t({ tr: 'Başarılı', en: 'Successful' })} stroke="#22C55E" fill="url(#colorSuccess)" strokeWidth={2} />
                <Area type="monotone" dataKey={t({ tr: 'Başarısız', en: 'Failed' })} stroke="#EF4444" fill="url(#colorFailed)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
