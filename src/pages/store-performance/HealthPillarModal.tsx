import { useState } from 'react'
import { Wifi } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useLang } from '@/contexts/LangContext'
import {
  useStoreAvailability,
  useDeviceStatusRealtime,
  type StorePeriod,
  type StoreHealthCategory,
} from './useStorePerformance'
import { PeriodSelector } from './PeriodSelector'
import { CiAvailabilityTable } from './CiAvailabilityTable'
import { CiAvailabilityDrawer } from './CiAvailabilityDrawer'
import { TicketStatsPanel } from './TicketStatsPanel'

export type HealthPillarKey = 'esl' | 'kiosk_pos' | 'network' | 'helpdesk'

const PILLAR_LABEL: Record<HealthPillarKey, { tr: string; en: string }> = {
  esl: { tr: 'ESL Durumu', en: 'ESL Status' },
  kiosk_pos: { tr: 'Kiosk & Mobil Kasa', en: 'Kiosk & Mobile POS' },
  network: { tr: 'Network', en: 'Network' },
  helpdesk: { tr: 'Yardım Masası', en: 'Help Desk' },
}

/** BT Sağlık Skoru'nun 4 sütunundan (Pillar) birine tıklanınca açılan
 * detay popup'ı — HealthScoreTab (yönetici) ve MyStorePage (çalışan)
 * PAYLAŞIR. esl/kiosk_pos/network → CI availability tablosu (aynı
 * CiAvailabilityTable/CiAvailabilityDrawer, öğeye tıklayınca olay
 * zaman çizelgesi). helpdesk → TicketStatsPanel (çağrı istatistikleri).
 * Kendi periyot seçicisi var — sayfanın (?period=) URL durumundan
 * BAĞIMSIZ, çünkü bu tek bir metriğin derinlemesine incelemesi. */
export function HealthPillarModal({
  siteId,
  storeName,
  pillar,
  onClose,
}: {
  siteId: string
  storeName: string
  pillar: HealthPillarKey
  onClose: () => void
}) {
  const { t } = useLang()
  const [period, setPeriod] = useState<StorePeriod>('week')

  return (
    <Modal open onClose={onClose} title={`${storeName} — ${t(PILLAR_LABEL[pillar])}`} widthClass="max-w-[640px]">
      <div className="space-y-4">
        <div className="flex justify-end">
          <PeriodSelector period={period} onChange={setPeriod} />
        </div>
        {pillar === 'helpdesk' ? (
          <TicketStatsPanel siteId={siteId} period={period} />
        ) : (
          <CategoryAvailabilityPanel siteId={siteId} period={period} category={pillar} />
        )}
      </div>
    </Modal>
  )
}

function CategoryAvailabilityPanel({
  siteId,
  period,
  category,
}: {
  siteId: string
  period: StorePeriod
  category: StoreHealthCategory
}) {
  const { t } = useLang()
  const [selectedCiId, setSelectedCiId] = useState<string | null>(null)

  useDeviceStatusRealtime(siteId)
  const { data: rows, isLoading } = useStoreAvailability(siteId, period, { category })

  const total = rows?.length ?? 0
  const onlineCount = rows?.filter((r) => r.is_currently_online).length ?? 0
  const validPercents = (rows ?? []).map((r) => r.availability_percent).filter((p): p is number => p != null)
  const avgAvailability = validPercents.length
    ? Math.round((validPercents.reduce((sum, v) => sum + v, 0) / validPercents.length) * 10) / 10
    : null
  const belowTargetCount =
    rows?.filter((r) => r.availability_percent != null && r.availability_target != null && r.availability_percent < r.availability_target).length ?? 0
  const selectedCi = rows?.find((r) => r.ci_id === selectedCiId) ?? null

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3 text-center">
          <div className="font-display text-xl font-bold">{avgAvailability != null ? `%${avgAvailability}` : '—'}</div>
          <div className="text-[10px] text-[var(--text-faint)] mt-1">{t({ tr: 'Ort. Çalışırlık', en: 'Avg. Availability' })}</div>
        </div>
        <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3 text-center">
          <div className="font-display text-xl font-bold flex items-center justify-center gap-1.5">
            <Wifi className="w-4 h-4 text-ok" />
            {onlineCount}
            <span className="text-[13px] font-normal text-[var(--text-faint)]">/{total}</span>
          </div>
          <div className="text-[10px] text-[var(--text-faint)] mt-1">{t({ tr: 'Çevrimiçi', en: 'Online' })}</div>
        </div>
        <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3 text-center">
          <div className={`font-display text-xl font-bold ${belowTargetCount > 0 ? 'text-p1' : ''}`}>{belowTargetCount}</div>
          <div className="text-[10px] text-[var(--text-faint)] mt-1">{t({ tr: 'Hedef Altı', en: 'Below Target' })}</div>
        </div>
      </div>

      <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] overflow-hidden">
        <CiAvailabilityTable rows={rows} isLoading={isLoading} onSelectCi={(row) => setSelectedCiId(row.ci_id)} />
      </div>

      {selectedCi && <CiAvailabilityDrawer ci={selectedCi} onClose={() => setSelectedCiId(null)} />}
    </>
  )
}
