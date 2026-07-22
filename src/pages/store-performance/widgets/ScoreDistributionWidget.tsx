import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLang } from '@/contexts/LangContext'
import { useStoreScorecard } from '../useStorePerformance'

export function ScoreDistributionWidget() {
  const { t } = useLang()
  const { data: scorecard } = useStoreScorecard()
  const stores = scorecard ?? []
  const sortedStores = [...stores].sort((a, b) => a.score - b.score)

  return (
    <div className="h-full border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4 flex flex-col">
      <h3 className="font-display text-[14px] font-bold mb-3 shrink-0">{t({ tr: 'Skor Dağılımı', en: 'Score Distribution' })}</h3>
      <ResponsiveContainer width="100%" height="100%" minHeight={120}>
        <BarChart data={sortedStores.slice(0, 8).map((s) => ({ name: s.site_name.slice(0, 10), skor: s.score }))} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-faint)' }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} width={70} />
          <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey="skor" fill="#17B0A7" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
