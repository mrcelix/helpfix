import { useState } from 'react'
import { Wifi } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useMySite } from '../useMyStore'
import { useStorePeriod, useStoreAvailability } from '@/pages/store-performance/useStorePerformance'
import { CiAvailabilityTable } from '@/pages/store-performance/CiAvailabilityTable'
import { CiAvailabilityDrawer } from '@/pages/store-performance/CiAvailabilityDrawer'

export function MyStoreLinesWidget() {
  const { t } = useLang()
  const { data: site } = useMySite()
  const [period] = useStorePeriod('week')
  const siteId = site?.id ?? null
  const { data: lineRows, isLoading: linesLoading } = useStoreAvailability(siteId, period, { category: 'network' })
  const [selectedCiId, setSelectedCiId] = useState<string | null>(null)
  const selectedCi = lineRows?.find((r) => r.ci_id === selectedCiId) ?? null

  return (
    <div className="h-full border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] overflow-hidden flex flex-col">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[var(--border)] shrink-0">
        <Wifi className="w-3.5 h-3.5 text-brand-dim" />
        <h3 className="font-display text-[14px] font-bold">{t({ tr: 'Hat Durumları', en: 'Line Status' })}</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        <CiAvailabilityTable rows={lineRows} isLoading={linesLoading} onSelectCi={(row) => setSelectedCiId(row.ci_id)} />
      </div>
      {selectedCi && <CiAvailabilityDrawer ci={selectedCi} onClose={() => setSelectedCiId(null)} />}
    </div>
  )
}
