import { useState } from 'react'
import { ArrowDown, Wifi, Tag, ShoppingCart, HelpCircle } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import {
  useStoreAvailability,
  useStoreCategorySummary,
  useDeviceStatusRealtime,
  type StorePeriod,
  type StoreHealthCategory,
  type StoreAvailabilityRow,
  type StoreScorecard,
} from './useStorePerformance'
import { CiAvailabilityTable } from './CiAvailabilityTable'
import { CiAvailabilityDrawer } from './CiAvailabilityDrawer'

const CATEGORY_META: Record<StoreHealthCategory, { label: { tr: string; en: string }; icon: typeof Wifi }> = {
  network: { label: { tr: 'Network (Hatlar)', en: 'Network (Lines)' }, icon: Wifi },
  esl: { label: { tr: 'ESL', en: 'ESL' }, icon: Tag },
  kiosk_pos: { label: { tr: 'Kiosk & POS', en: 'Kiosk & POS' }, icon: ShoppingCart },
  other: { label: { tr: 'Diğer', en: 'Other' }, icon: HelpCircle },
}
const CATEGORY_ORDER: StoreHealthCategory[] = ['network', 'esl', 'kiosk_pos', 'other']

/** Faz MP-2 — Hatlar & Cihazlar sekmesi. Seçilen mağazanın network/esl/
 * kiosk_pos/other kategorilerini özetler, karta tıklayınca tabloyu o
 * kategoriye süzer. Realtime: device_status_events insert'i ile anlık
 * durum noktası otomatik güncellenir. */
export function LinesDevicesTab({ stores, period }: { stores: StoreScorecard[]; period: StorePeriod }) {
  const { t } = useLang()
  const [siteId, setSiteId] = useState<string | null>(stores[0]?.site_id ?? null)
  const [filterCategory, setFilterCategory] = useState<StoreHealthCategory | null>(null)
  const [selectedCi, setSelectedCi] = useState<StoreAvailabilityRow | null>(null)

  useDeviceStatusRealtime(siteId)
  const { data: summary } = useStoreCategorySummary(siteId, period)
  const { data: rows, isLoading } = useStoreAvailability(siteId, period, { category: filterCategory })

  const summaryByCategory = new Map(summary?.map((s) => [s.category, s]))

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display text-[15px] font-bold">{t({ tr: 'Hatlar & Cihazlar', en: 'Lines & Devices' })}</h3>
        <select
          value={siteId ?? ''}
          onChange={(e) => {
            setSiteId(e.target.value)
            setFilterCategory(null)
          }}
          className="text-[11.5px] font-semibold bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1.5"
        >
          {stores.map((s) => (
            <option key={s.site_id} value={s.site_id}>
              {s.site_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {CATEGORY_ORDER.map((cat) => {
          const s = summaryByCategory.get(cat)
          const Icon = CATEGORY_META[cat].icon
          const active = filterCategory === cat
          const belowTarget = (s?.below_target_count ?? 0) > 0
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory((cur) => (cur === cat ? null : cat))}
              className={`text-left border rounded-xl p-3.5 transition-colors ${
                active ? 'border-brand bg-brand-tint/40' : 'border-[var(--border)] bg-[var(--panel)] hover:border-brand/40'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                <span className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide truncate">
                  {t(CATEGORY_META[cat].label)}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div className="font-display text-[20px] font-bold">
                  {s?.avg_availability_percent != null ? `%${s.avg_availability_percent}` : '—'}
                </div>
                {belowTarget && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-p1">
                    <ArrowDown className="w-3 h-3" />
                    {s?.below_target_count}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[var(--text-faint)] mt-0.5">
                {s?.total_count ?? 0} {t({ tr: 'cihaz', en: 'devices' })}
              </div>
            </button>
          )
        })}
      </div>

      <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] overflow-hidden">
        <CiAvailabilityTable rows={rows} isLoading={isLoading} onSelectCi={setSelectedCi} />
      </div>

      {selectedCi && <CiAvailabilityDrawer ci={selectedCi} onClose={() => setSelectedCi(null)} />}
    </div>
  )
}
