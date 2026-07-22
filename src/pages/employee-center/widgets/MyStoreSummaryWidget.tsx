import { Tag, ShoppingCart, HelpCircle } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useMySite, useMyStoreIncidents, useMyStoreAssets, useMyStoreConsumables } from '../useMyStore'
import { useStorePeriod, useStoreCategorySummary, type StoreHealthCategory } from '@/pages/store-performance/useStorePerformance'

const THIRD_PARTY_CATEGORIES: StoreHealthCategory[] = ['esl', 'kiosk_pos', 'other']
const CATEGORY_META: Record<StoreHealthCategory, { label: { tr: string; en: string }; icon: typeof Tag }> = {
  network: { label: { tr: 'Network', en: 'Network' }, icon: Tag },
  esl: { label: { tr: 'ESL', en: 'ESL' }, icon: Tag },
  kiosk_pos: { label: { tr: 'Kiosk & POS', en: 'Kiosk & POS' }, icon: ShoppingCart },
  other: { label: { tr: 'Diğer', en: 'Other' }, icon: HelpCircle },
}

export function MyStoreSummaryWidget() {
  const { t } = useLang()
  const { data: site } = useMySite()
  const { data: incidents } = useMyStoreIncidents()
  const { data: assets } = useMyStoreAssets()
  const { data: consumables } = useMyStoreConsumables()
  const [period] = useStorePeriod('week')
  const { data: categorySummary } = useStoreCategorySummary(site?.id ?? null, period)

  const openIncidents = incidents?.filter((i) => !['resolved', 'closed', 'merged'].includes(i.status)).length ?? 0
  const onlineAssets = assets?.filter((a) => a.is_online).length ?? 0
  const thirdPartySummary = categorySummary?.filter((s) => THIRD_PARTY_CATEGORIES.includes(s.category)) ?? []

  return (
    <div className="h-full overflow-y-auto space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4">
          <div className="font-display text-2xl font-bold">{openIncidents}</div>
          <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Açık Talep', en: 'Open Tickets', fr: 'Tickets ouverts', it: 'Ticket aperti', ar: 'الطلبات المفتوحة' })}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4">
          <div className="font-display text-2xl font-bold">
            {onlineAssets}<span className="text-[13px] font-normal text-[var(--text-faint)]">/{assets?.length ?? 0}</span>
          </div>
          <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Çevrimiçi Cihaz', en: 'Online Devices', fr: 'Appareils en ligne', it: 'Dispositivi online', ar: 'الأجهزة المتصلة' })}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4">
          <div className="font-display text-2xl font-bold">{consumables?.length ?? 0}</div>
          <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Sarf/Aksesuar Kalemi', en: 'Consumable Items', fr: 'Articles consommables', it: 'Materiali di consumo', ar: 'المواد الاستهلاكية' })}</div>
        </div>
      </div>

      {!!thirdPartySummary.length && (
        <div>
          <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2">
            {t({ tr: '3. Parti Cihaz Özeti', en: 'Third-Party Device Summary' })}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {thirdPartySummary.map((s) => {
              const Icon = CATEGORY_META[s.category].icon
              return (
                <div key={s.category} className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                    <span className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide truncate">{t(CATEGORY_META[s.category].label)}</span>
                  </div>
                  <div className="font-display text-[18px] font-bold">{s.avg_availability_percent != null ? `%${s.avg_availability_percent}` : '—'}</div>
                  <div className="text-[10px] text-[var(--text-faint)] mt-0.5">
                    {s.below_target_count > 0 ? (
                      <span className="text-p1 font-bold">{s.below_target_count} {t({ tr: 'hedef altı', en: 'below target' })}</span>
                    ) : (
                      `${s.total_count} ${t({ tr: 'cihaz', en: 'devices' })}`
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
