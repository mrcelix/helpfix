import { useState } from 'react'
import { useLang } from '@/contexts/LangContext'
import {
  useStoreAvailability,
  useInventoryStatusBreakdown,
  type StorePeriod,
  type StoreAvailabilityRow,
  type StoreScorecard,
} from './useStorePerformance'
import { CiAvailabilityTable } from './CiAvailabilityTable'
import { CiAvailabilityDrawer } from './CiAvailabilityDrawer'

const STATUS_LABEL: Record<string, { tr: string; en: string }> = {
  active: { tr: 'Aktif', en: 'Active' },
  in_repair: { tr: 'Onarımda', en: 'In Repair' },
  retired: { tr: 'Emekli', en: 'Retired' },
  unmanaged: { tr: 'Yönetilmeyen', en: 'Unmanaged' },
}
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-ok',
  in_repair: 'bg-p2',
  retired: 'bg-[var(--text-faint)]',
  unmanaged: 'bg-p3',
}

/** Faz MP-2 — Envanter SLA sekmesi. store_health_category NULL olan
 * (çalışana zimmetli) CI'lar için Hatlar & Cihazlar ile AYNI tabloyu
 * kullanır (CiAvailabilityTable) — ayrıca ci_status kırılımı mini bar. */
export function InventorySlaTab({ stores, period }: { stores: StoreScorecard[]; period: StorePeriod }) {
  const { t } = useLang()
  const [siteId, setSiteId] = useState<string | null>(stores[0]?.site_id ?? null)
  const [selectedCi, setSelectedCi] = useState<StoreAvailabilityRow | null>(null)

  const { data: rows, isLoading } = useStoreAvailability(siteId, period, { uncategorized: true })
  const { data: statusBreakdown } = useInventoryStatusBreakdown(siteId)

  const statusTotal = statusBreakdown ? Object.values(statusBreakdown).reduce((s, n) => s + n, 0) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display text-[15px] font-bold">{t({ tr: 'Envanter SLA', en: 'Inventory SLA' })}</h3>
        <select
          value={siteId ?? ''}
          onChange={(e) => setSiteId(e.target.value)}
          className="text-[11.5px] font-semibold bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1.5"
        >
          {stores.map((s) => (
            <option key={s.site_id} value={s.site_id}>
              {s.site_name}
            </option>
          ))}
        </select>
      </div>

      {!!statusTotal && (
        <div className="border border-[var(--border)] rounded-xl bg-[var(--panel)] p-3.5 mb-4">
          <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2">
            {t({ tr: 'Envanter Durumu', en: 'Inventory Status' })}
          </div>
          <div className="h-2 rounded-full overflow-hidden flex bg-[var(--panel-2)] mb-2">
            {Object.entries(statusBreakdown!).map(([status, count]) =>
              count > 0 ? <div key={status} className={STATUS_COLOR[status]} style={{ width: `${(count / statusTotal) * 100}%` }} /> : null
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(statusBreakdown!).map(([status, count]) =>
              count > 0 ? (
                <span key={status} className="flex items-center gap-1.5 text-[11px] text-[var(--text-sub)]">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[status]}`} />
                  {t(STATUS_LABEL[status] ?? { tr: status, en: status })} · {count}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] overflow-hidden">
        <CiAvailabilityTable rows={rows} isLoading={isLoading} onSelectCi={setSelectedCi} />
      </div>

      {selectedCi && <CiAvailabilityDrawer ci={selectedCi} onClose={() => setSelectedCi(null)} />}
    </div>
  )
}
