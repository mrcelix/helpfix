import { useState } from 'react'
import { ChevronRight, Wifi, Store as StoreIcon } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useStoreScorecard, useStorePeriod, scoreLevel, type StoreScorecard } from '../useStorePerformance'
import { StoreDetailDrawer } from '../StoreDetailDrawer'

export function ScorecardWidget() {
  const { t } = useLang()
  const { data: scorecard, isLoading } = useStoreScorecard()
  const [period] = useStorePeriod()
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score')
  const [selectedStore, setSelectedStore] = useState<StoreScorecard | null>(null)

  const stores = scorecard ?? []
  const sortedStores = [...stores].sort((a, b) => (sortBy === 'score' ? a.score - b.score : a.site_name.localeCompare(b.site_name)))

  return (
    <div className="h-full border border-[var(--border)] rounded-[var(--radius-app)] overflow-hidden bg-[var(--panel)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
        <h3 className="font-display text-[14px] font-bold">{t({ tr: 'Mağaza Skor Kartı', en: 'Store Scorecard' })}</h3>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'score' | 'name')} className="text-[11.5px] font-semibold bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1">
          <option value="score">{t({ tr: 'Skora göre (düşükten)', en: 'By score (lowest first)' })}</option>
          <option value="name">{t({ tr: 'İsme göre', en: 'By name' })}</option>
        </select>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="text-[12px] text-[var(--text-faint)] py-10 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>}
        {!isLoading && !stores.length && (
          <div className="text-[12px] text-[var(--text-faint)] py-10 text-center px-6">
            {t({ tr: "Henüz site tanımlı değil — Admin Panel > Siteler'den mağazalarınızı ekleyin.", en: 'No sites defined yet — add your stores via Admin Panel > Sites.' })}
          </div>
        )}
        <div className="divide-y divide-[var(--border)]">
          {sortedStores.map((s) => {
            const level = scoreLevel(s.score)
            return (
              <button key={s.site_id} onClick={() => setSelectedStore(s)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--row-hover)]">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-display font-bold text-[13px] ${level === 'good' ? 'bg-ok/15 text-ok' : level === 'warn' ? 'bg-p2-tint text-p2' : 'bg-p1-tint text-p1'}`}>
                  {s.score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold flex items-center gap-1.5">
                    <StoreIcon className="w-3.5 h-3.5 text-[var(--text-faint)]" />
                    {s.site_name}
                    {s.is_headquarters && <span className="text-[9px] font-bold bg-brand-tint text-brand-dim rounded-full px-1.5 py-0.5">HQ</span>}
                  </div>
                  <div className="text-[11px] text-[var(--text-faint)] mt-0.5 flex items-center gap-2.5">
                    <span className="flex items-center gap-1">
                      <Wifi className="w-3 h-3" />
                      {s.online_devices}/{s.total_devices}
                    </span>
                    <span>{t({ tr: 'SLA', en: 'SLA' })} %{s.sla_compliant_pct}</span>
                    {s.critical_open_incidents > 0 && <span className="text-p1 font-bold">{s.critical_open_incidents} {t({ tr: 'kritik', en: 'critical' })}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-faint)] shrink-0" />
              </button>
            )
          })}
        </div>
      </div>
      {selectedStore && <StoreDetailDrawer store={selectedStore} period={period} onClose={() => setSelectedStore(null)} />}
    </div>
  )
}
