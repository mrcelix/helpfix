import { Store, AlertTriangle, Package, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import {
  useMySite,
  useMyStoreIncidents,
  useMyStoreConsumables,
  useMyStoreIntegrationStatus,
} from './useMyStore'
import { useStorePeriod, useDeviceStatusRealtime } from '@/pages/store-performance/useStorePerformance'
import { PeriodSelector } from '@/pages/store-performance/PeriodSelector'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'

export function MyStorePage() {
  const { lang, t } = useLang()
  const { data: site, isLoading: siteLoading, error: siteError } = useMySite()
  const { data: incidents } = useMyStoreIncidents()
  const { data: consumables } = useMyStoreConsumables()
  const { data: integrationStatus } = useMyStoreIntegrationStatus()

  // Faz MP-3 — G/H/A periyot seçici (Yıllık'a gerek yok, çalışan görünümü
  // için kısa vadeli görünüm yeterli). Salt-okunur: yönetici aksiyonları
  // (Anlık Görüntü Al, Haftalık Skor Üret vb.) burada YOK.
  const [period, setPeriod] = useStorePeriod('week')
  useDeviceStatusRealtime(site?.id ?? null)

  if (siteLoading) {
    return <div className="py-16 text-center text-[13px] text-[var(--text-faint)]">{t({ tr: 'Yükleniyor…', en: 'Loading…', fr: 'Chargement…', it: 'Caricamento…', ar: 'جارٍ التحميل…' })}</div>
  }

  if (siteError) {
    return (
      <div className="py-16 text-center px-6">
        <Store className="w-10 h-10 text-p1 mx-auto mb-3" />
        <p className="text-[13px] text-p1 max-w-sm mx-auto">
          {t({ tr: 'Mağaza bilgisi yüklenemedi.', en: 'Failed to load store info.' })}
        </p>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="py-16 text-center px-6">
        <Store className="w-10 h-10 text-[var(--text-faint)] mx-auto mb-3" />
        <p className="text-[13px] text-[var(--text-faint)] max-w-sm mx-auto">
          {t({
            tr: 'Henüz bir mağazaya atanmadınız. Yöneticinizden Admin Panel > Kullanıcılar üzerinden mağaza ataması yapmasını isteyin.',
            en: "You haven't been assigned to a store yet. Ask your manager to assign one from Admin Panel > Users.",
          })}
        </p>
      </div>
    )
  }

  const criticalOpen = incidents?.filter((i) => i.priority === 'P1' && !['resolved', 'closed', 'merged'].includes(i.status)).length ?? 0
  const lowStockConsumables = consumables?.filter((c) => c.total_quantity <= c.low_stock_threshold) ?? []

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-brand-tint flex items-center justify-center shrink-0">
          <Store className="w-5 h-5 text-brand-dim" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-[20px] font-bold tracking-tight">{site.name}</h1>
          <p className="text-[12.5px] text-[var(--text-faint)]">{site.city}</p>
        </div>
        <PeriodSelector period={period} onChange={setPeriod} periods={['day', 'week', 'month']} />
        {integrationStatus && integrationStatus.active_endpoints > 0 && (
          <div className="flex items-center gap-1.5 bg-[var(--panel)] border border-[var(--border)] rounded-full px-3 py-1.5">
            {integrationStatus.last_status === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
            ) : integrationStatus.last_status === 'error' ? (
              <XCircle className="w-3.5 h-3.5 text-p1" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-[var(--text-faint)]" />
            )}
            <span className="text-[11px] font-semibold text-[var(--text-sub)]">
              {t({ tr: 'Canlı izleme', en: 'Live monitoring' })}
              {integrationStatus.last_synced_at && (
                <>
                  {' · '}
                  {new Date(integrationStatus.last_synced_at).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {(criticalOpen > 0 || lowStockConsumables.length > 0) && (
        <div className="flex flex-col gap-2 mb-5">
          {criticalOpen > 0 && (
            <div className="flex items-center gap-2.5 bg-p1-tint border border-p1/40 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-p1 shrink-0" />
              <span className="text-[12.5px] font-bold text-p1">
                {t({ tr: `Mağazanızda ${criticalOpen} kritik açık talep var`, en: `${criticalOpen} critical open ticket(s) at your store`, fr: `${criticalOpen} ticket(s) critique(s) ouvert(s) dans votre magasin`, it: `${criticalOpen} ticket critici aperti nel tuo negozio`, ar: `يوجد ${criticalOpen} طلب حرج مفتوح في متجرك` })}
              </span>
            </div>
          )}
          {lowStockConsumables.length > 0 && (
            <div className="flex items-center gap-2.5 bg-p2-tint border border-p2/40 rounded-xl px-4 py-3">
              <Package className="w-4 h-4 text-p2 shrink-0" />
              <span className="text-[12.5px] font-bold text-p2">
                {t({ tr: 'Düşük stok:', en: 'Low stock:', fr: 'Stock faible :', it: 'Scorte basse:', ar: 'مخزون منخفض:' })} {lowStockConsumables.map((c) => c.name).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      <DashboardGrid surface="my_store" />
    </div>
  )
}
