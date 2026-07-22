import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLang } from '@/contexts/LangContext'
import { useMyRequests } from '@/pages/service-desk/useIncidents'

export function TicketVolumeChartWidget() {
  const { lang, t } = useLang()
  const { data: myRequests } = useMyRequests()

  const monthlyVolume = useMemo(() => {
    const months: { key: string; label: string; count: number }[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      months.push({ key, label: d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short' }), count: 0 })
    }
    myRequests?.forEach((r) => {
      const d = new Date(r.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const bucket = months.find((m) => m.key === key)
      if (bucket) bucket.count += 1
    })
    return months
  }, [myRequests, lang])

  return (
    <div className="h-full bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5">
      <div className="text-[13px] font-bold mb-1">{t({ tr: 'Talep Hacminiz', en: 'Your Ticket Volume', fr: 'Votre volume de tickets', it: 'Il tuo volume di ticket', ar: 'حجم طلباتك' })}</div>
      <div className="text-[11px] text-[var(--text-faint)] mb-3">{t({ tr: 'Son 6 ay', en: 'Last 6 months', fr: 'Les 6 derniers mois', it: 'Ultimi 6 mesi', ar: 'آخر 6 أشهر' })}</div>
      <ResponsiveContainer width="100%" height="80%" minHeight={100}>
        <BarChart data={monthlyVolume}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} allowDecimals={false} width={24} />
          <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey="count" fill="#17B0A7" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
