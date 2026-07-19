import { useState } from 'react'
import { AlertTriangle, Wifi, Tag, ShoppingCart, HelpCircle, Plug } from 'lucide-react'
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
import { useIntegrationEndpoints } from './useIntegrations'
import { CiAvailabilityTable } from './CiAvailabilityTable'
import { CiAvailabilityDrawer } from './CiAvailabilityDrawer'
import { NewTicketModal } from '@/pages/service-desk/NewTicketModal'

const CATEGORY_META: Record<StoreHealthCategory, { label: { tr: string; en: string }; icon: typeof Wifi }> = {
  network: { label: { tr: 'Network (Hatlar)', en: 'Network (Lines)' }, icon: Wifi },
  esl: { label: { tr: 'ESL', en: 'ESL' }, icon: Tag },
  kiosk_pos: { label: { tr: 'Kiosk & POS', en: 'Kiosk & POS' }, icon: ShoppingCart },
  other: { label: { tr: 'Diğer', en: 'Other' }, icon: HelpCircle },
}
const CATEGORY_ORDER: StoreHealthCategory[] = ['network', 'esl', 'kiosk_pos', 'other']
const LINE_TYPE_LABEL: Record<string, string> = { dsl: 'DSL', mpls: 'MPLS', '3g': '3G', fiber: 'Fiber', other: 'Diğer' }
const CATEGORY_TICKET_LABEL: Record<StoreHealthCategory, { tr: string; en: string }> = {
  network: { tr: 'Ağ & VPN', en: 'Network & VPN' },
  esl: { tr: 'Donanım', en: 'Hardware' },
  kiosk_pos: { tr: 'Donanım', en: 'Hardware' },
  other: { tr: 'Donanım', en: 'Hardware' },
}

/** Faz MP-2 — Hatlar & Cihazlar sekmesi. Seçilen mağazanın network/esl/
 * kiosk_pos/other kategorilerini özetler, karta tıklayınca tabloyu o
 * kategoriye süzer. Realtime: device_status_events insert'i ile anlık
 * durum noktası otomatik güncellenir.
 * Faz MP-4: hedef altı satırlarda "Talep Aç" hızlı aksiyonu + entegrasyon
 * tanımlı değilse Entegrasyonlar sekmesine yönlendiren boş durum. */
export function LinesDevicesTab({
  stores,
  period,
  onGoToIntegrations,
}: {
  stores: StoreScorecard[]
  period: StorePeriod
  onGoToIntegrations: () => void
}) {
  const { t } = useLang()
  // stores prop, ebeveynin useStoreScorecard() sorgusu yüklenirken boş
  // dizi olarak gelebilir; siteId'yi ilk render'da stores[0] ile
  // başlatmak (useState initializer) bu durumda kalıcı olarak null'a
  // saplanıp kalırdı — bunun yerine "seçim yoksa ilk mağaza" hesaplanır.
  const [siteId, setSiteId] = useState<string | null>(null)
  const activeSiteId = siteId ?? stores[0]?.site_id ?? null
  const [filterCategory, setFilterCategory] = useState<StoreHealthCategory | null>(null)
  // ci_id tutuluyor, tam satır DEĞİL — böylece Realtime bir olayla `rows`
  // tazelendiğinde açık drawer'ın "anlık" bilgileri (durum, availability)
  // donmuş bir kopya göstermek yerine gerçekten güncel kalır.
  const [selectedCiId, setSelectedCiId] = useState<string | null>(null)
  const [ticketPrefill, setTicketPrefill] = useState<{ title: string; category: string } | null>(null)

  useDeviceStatusRealtime(activeSiteId)
  const { data: summary } = useStoreCategorySummary(activeSiteId, period)
  const { data: rows, isLoading } = useStoreAvailability(activeSiteId, period, { category: filterCategory })
  const { data: endpoints } = useIntegrationEndpoints()

  const selectedCi = rows?.find((r) => r.ci_id === selectedCiId) ?? null
  const summaryByCategory = new Map(summary?.map((s) => [s.category, s]))
  const hasIntegration = endpoints?.some((e) => e.site_id === activeSiteId) ?? false
  const storeName = stores.find((s) => s.site_id === activeSiteId)?.site_name ?? ''

  function quickCreateTicket(row: StoreAvailabilityRow) {
    const pct = row.availability_percent != null ? `%${row.availability_percent}` : t({ tr: 'veri yok', en: 'no data' })
    // Satırın gerçek kategorisi RPC'nin dönüşünde yok (ci_id/name/ci_type/
    // line_type var, store_health_category yok) — bu yüzden line_type'a
    // bakıyoruz (hat mı değil mi kesin bilgi). Hat değilse esl/kiosk_pos/
    // other'ın hepsi zaten aynı "Donanım" etiketine düşüyor (bkz.
    // CATEGORY_TICKET_LABEL), dolayısıyla filterCategory'ye güvenmeye
    // gerek yok — "tümü" görünümünde de doğru sonuç verir.
    const category = t(CATEGORY_TICKET_LABEL[row.line_type ? 'network' : 'other'])
    const subject = row.line_type
      ? `${LINE_TYPE_LABEL[row.line_type] ?? row.line_type} ${t({ tr: 'hattı', en: 'line' })}`
      : row.name
    setTicketPrefill({
      title: `[${storeName}] ${subject} ${t({ tr: 'hedef altı', en: 'below target' })} — ${pct}`,
      category,
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display text-[15px] font-bold">{t({ tr: 'Hatlar & Cihazlar', en: 'Lines & Devices' })}</h3>
        <select
          value={activeSiteId ?? ''}
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
              aria-pressed={active}
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
                  <span
                    className="flex items-center gap-0.5 text-[10px] font-bold text-p1"
                    title={t({ tr: 'Şu an hedef altında (trend değil, anlık sayım)', en: 'Currently below target (a live count, not a trend)' })}
                  >
                    <AlertTriangle className="w-3 h-3" />
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
        {!isLoading && !rows?.length && !hasIntegration ? (
          <div className="text-[12px] text-[var(--text-faint)] py-10 text-center px-6">
            <Plug className="w-6 h-6 mx-auto mb-2 text-[var(--text-faint)]" />
            {t({
              tr: 'Cihaz durumu için Entegrasyonlar sekmesinden endpoint tanımlayın.',
              en: 'Define an endpoint in the Integrations tab to get device status.',
            })}
            <button onClick={onGoToIntegrations} className="block mx-auto mt-2 text-[11.5px] font-bold text-brand-dim">
              {t({ tr: 'Entegrasyonlar sekmesine git →', en: 'Go to Integrations tab →' })}
            </button>
          </div>
        ) : (
          <CiAvailabilityTable rows={rows} isLoading={isLoading} onSelectCi={(row) => setSelectedCiId(row.ci_id)} onQuickCreateTicket={quickCreateTicket} />
        )}
      </div>

      {selectedCi && <CiAvailabilityDrawer ci={selectedCi} onClose={() => setSelectedCiId(null)} />}
      {ticketPrefill && (
        <NewTicketModal
          initialTitle={ticketPrefill.title}
          initialCategory={ticketPrefill.category}
          onClose={() => setTicketPrefill(null)}
        />
      )}
    </div>
  )
}
