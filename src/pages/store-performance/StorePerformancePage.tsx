import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Camera, AlertTriangle } from 'lucide-react'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { useStoreScorecard, useCaptureSnapshot, useStoreScoreTrend, useStorePeriod, scoreLevel, type StoreScorecard, type StorePeriod } from './useStorePerformance'
import { StoreDetailDrawer } from './StoreDetailDrawer'
import { HealthScoreTab } from './HealthScoreTab'
import { IntegrationsTab } from './IntegrationsTab'
import { LinesDevicesTab } from './LinesDevicesTab'
import { InventorySlaTab } from './InventorySlaTab'
import { PeriodSelector } from './PeriodSelector'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'

type PageTab = 'dashboard' | 'health-score' | 'history' | 'lines-devices' | 'inventory-sla' | 'integrations'

export function StorePerformancePage() {
  const { t } = useLang()
  const { profile } = useAuth()
  const canManage = profile && ['tenant_admin', 'manager'].includes(profile.role)
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [pageTab, setPageTab] = useState<PageTab>(
    (['dashboard', 'health-score', 'history', 'lines-devices', 'inventory-sla', 'integrations'] as string[]).includes(initialTab ?? '')
      ? (initialTab as PageTab)
      : 'dashboard'
  )
  const [selectedStore, setSelectedStore] = useState<StoreScorecard | null>(null)
  const [period, setPeriod] = useStorePeriod()

  const { data: scorecard } = useStoreScorecard()
  const captureSnapshot = useCaptureSnapshot()

  const stores = scorecard ?? []
  const avgScore = stores.length ? Math.round((stores.reduce((s, x) => s + x.score, 0) / stores.length) * 10) / 10 : 0
  const totalOffline = stores.reduce((s, x) => s + (x.total_devices - x.online_devices), 0)
  const totalCritical = stores.reduce((s, x) => s + x.critical_open_incidents, 0)
  const worstStores = [...stores].sort((a, b) => a.score - b.score).slice(0, 3)

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">{t({ tr: 'Mağaza Performansı', en: 'Store Performance' })}</h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'BT hizmet skoru, SLA takibi ve envanter durumu — mağaza bazlı', en: 'IT service score, SLA tracking, and inventory status — by store' })}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <PeriodSelector period={period} onChange={setPeriod} />
          {canManage && (
            <Button onClick={() => captureSnapshot.mutate()} disabled={captureSnapshot.isPending}>
              <Camera className="w-[15px] h-[15px]" />
              {captureSnapshot.isPending ? t({ tr: 'Alınıyor…', en: 'Capturing…' }) : t({ tr: 'Anlık Görüntü Al', en: 'Take Snapshot' })}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label={t({ tr: 'Ortalama Skor', en: 'Average Score' })} value={avgScore} accent={scoreLevel(avgScore) === 'good' ? 'text-ok' : scoreLevel(avgScore) === 'warn' ? 'text-p2' : 'text-p1'} />
        <Kpi label={t({ tr: 'Toplam Mağaza', en: 'Total Stores' })} value={stores.length} accent="text-[var(--text)]" />
        <Kpi label={t({ tr: 'Offline Cihaz', en: 'Offline Devices' })} value={totalOffline} accent={totalOffline > 0 ? 'text-p1' : 'text-ok'} />
        <Kpi label={t({ tr: 'Kritik Açık Kayıt', en: 'Critical Open' })} value={totalCritical} accent={totalCritical > 0 ? 'text-p1' : 'text-ok'} />
      </div>

      {!!worstStores.length && worstStores[0].score < 80 && (
        <div className="flex items-start gap-2.5 bg-p2-tint border border-p2/40 rounded-xl px-4 py-3 mb-5">
          <AlertTriangle className="w-4 h-4 text-p2 shrink-0 mt-0.5" />
          <div>
            <div className="text-[12.5px] font-bold text-p2 mb-1">{t({ tr: 'Dikkat Gerektiren Mağazalar', en: 'Stores Needing Attention' })}</div>
            <div className="text-[11.5px] text-[var(--text-sub)]">
              {worstStores
                .filter((s) => s.score < 80)
                .map((s) => `${s.site_name} (${s.score})`)
                .join(' · ')}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-[var(--border)] mb-4 overflow-x-auto">
        <button
          onClick={() => setPageTab('dashboard')}
          className={`shrink-0 whitespace-nowrap px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${pageTab === 'dashboard' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Dashboard', en: 'Dashboard' })}
        </button>
        <button
          onClick={() => setPageTab('health-score')}
          className={`shrink-0 whitespace-nowrap px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${pageTab === 'health-score' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Sağlık Skoru (A/B/C)', en: 'Health Score (A/B/C)' })}
        </button>
        <button
          onClick={() => setPageTab('history')}
          className={`shrink-0 whitespace-nowrap px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${pageTab === 'history' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Geçmiş', en: 'History' })}
        </button>
        <button
          onClick={() => setPageTab('lines-devices')}
          className={`shrink-0 whitespace-nowrap px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${pageTab === 'lines-devices' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Hatlar & Cihazlar', en: 'Lines & Devices' })}
        </button>
        <button
          onClick={() => setPageTab('inventory-sla')}
          className={`shrink-0 whitespace-nowrap px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${pageTab === 'inventory-sla' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Envanter SLA', en: 'Inventory SLA' })}
        </button>
        <button
          onClick={() => setPageTab('integrations')}
          className={`shrink-0 whitespace-nowrap px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${pageTab === 'integrations' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Entegrasyonlar', en: 'Integrations' })}
        </button>
      </div>

      {pageTab === 'health-score' && <HealthScoreTab />}
      {pageTab === 'lines-devices' && (
        <LinesDevicesTab stores={stores} period={period} onGoToIntegrations={() => setPageTab('integrations')} />
      )}
      {pageTab === 'inventory-sla' && <InventorySlaTab stores={stores} period={period} />}
      {pageTab === 'integrations' && <IntegrationsTab />}

      {pageTab === 'dashboard' && <DashboardGrid surface="store_performance_dashboard" />}

      {pageTab === 'history' && <StoreHistoryTab stores={stores} period={period} onOpenStore={setSelectedStore} />}

      {selectedStore && <StoreDetailDrawer store={selectedStore} period={period} onClose={() => setSelectedStore(null)} />}
    </div>
  )
}

/** Faz MP-2: bu sekme artık sabit 90 günlük değil, sayfa başlığındaki
 * G/H/A/Y periyot seçicisine göre get_store_score_trend'ten besleniyor —
 * day→son 7 gün, week→son 8 hafta, month→son 12 hafta, year→son 12 ay. */
function StoreHistoryTab({ stores, period, onOpenStore }: { stores: StoreScorecard[]; period: StorePeriod; onOpenStore: (s: StoreScorecard) => void }) {
  const { t } = useLang()
  // stores prop ebeveyn sorgusu yüklenirken boş dizi olabilir; siteId'yi
  // useState initializer ile stores[0]'a sabitlemek bu durumda kalıcı
  // null'a saplanırdı — bkz. LinesDevicesTab'daki aynı düzeltme.
  const [compareSiteId, setCompareSiteId] = useState<string | null>(null)
  const activeCompareSiteId = compareSiteId ?? stores[0]?.site_id ?? null
  const { data: trend, isLoading: trendLoading } = useStoreScoreTrend(activeCompareSiteId, period)

  const chartData = trend?.map((p) => ({
    date: p.period_label,
    [t({ tr: 'Skor', en: 'Score' })]: p.score,
  }))

  return (
    <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-[14px] font-bold">{t({ tr: 'Mağaza Geçmiş Trendi', en: 'Store History Trend' })}</h3>
        <select value={activeCompareSiteId ?? ''} onChange={(e) => setCompareSiteId(e.target.value)} className="text-[11.5px] font-semibold bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1.5">
          {stores.map((s) => (
            <option key={s.site_id} value={s.site_id}>
              {s.site_name}
            </option>
          ))}
        </select>
      </div>

      {trendLoading && <p className="text-[12px] text-[var(--text-faint)] py-12 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}

      {!trendLoading && !chartData?.length && (
        <p className="text-[12px] text-[var(--text-faint)] py-12 text-center">
          {t({
            tr: 'Bu periyot için henüz veri yok. Günlük görünüm "Anlık Görüntü Al" butonuna, haftalık/aylık/yıllık görünüm ise Sağlık Skoru sekmesindeki "Haftalık Skor Üret" butonuna bağlıdır.',
            en: 'No data for this period yet. The daily view depends on "Take Snapshot"; weekly/monthly/yearly views depend on "Generate Weekly Score" in the Health Score tab.',
          })}
        </p>
      )}

      {!!chartData?.length && (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} width={28} />
            <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey={t({ tr: 'Skor', en: 'Score' })} stroke="#17B0A7" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {!!stores.length && activeCompareSiteId && (
        <button onClick={() => onOpenStore(stores.find((s) => s.site_id === activeCompareSiteId)!)} className="mt-3 text-[11.5px] font-bold text-brand-dim">
          {t({ tr: 'Bu mağazanın detayını aç →', en: "Open this store's detail →" })}
        </button>
      )}
    </div>
  )
}

function Kpi({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4">
      <div className={`font-display text-2xl font-bold ${accent}`}>{value}</div>
      <div className="text-[11px] text-[var(--text-faint)] mt-1">{label}</div>
    </div>
  )
}
