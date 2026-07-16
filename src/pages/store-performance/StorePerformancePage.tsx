import { useState } from 'react'
import { Camera, AlertTriangle, Wifi, ChevronRight, Store as StoreIcon, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import {
  useStoreScorecard,
  useCaptureSnapshot,
  useStoreScoreTrend,
  useStorePeriod,
  scoreLevel,
  type StoreScorecard,
  type StorePeriod,
} from './useStorePerformance'
import { useIntegrationSummary, useSyncNow } from './useIntegrations'
import { StoreDetailDrawer } from './StoreDetailDrawer'
import { HealthScoreTab } from './HealthScoreTab'
import { IntegrationsTab } from './IntegrationsTab'
import { LinesDevicesTab } from './LinesDevicesTab'
import { InventorySlaTab } from './InventorySlaTab'
import { PeriodSelector } from './PeriodSelector'

export function StorePerformancePage() {
  const { t } = useLang()
  const [pageTab, setPageTab] = useState<'dashboard' | 'health-score' | 'history' | 'lines-devices' | 'inventory-sla' | 'integrations'>('dashboard')
  const [selectedStore, setSelectedStore] = useState<StoreScorecard | null>(null)
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score')
  const [period, setPeriod] = useStorePeriod()

  const { data: scorecard, isLoading } = useStoreScorecard()
  const captureSnapshot = useCaptureSnapshot()

  const stores = scorecard ?? []
  const avgScore = stores.length ? Math.round((stores.reduce((s, x) => s + x.score, 0) / stores.length) * 10) / 10 : 0
  const totalOffline = stores.reduce((s, x) => s + (x.total_devices - x.online_devices), 0)
  const totalCritical = stores.reduce((s, x) => s + x.critical_open_incidents, 0)
  const worstStores = [...stores].sort((a, b) => a.score - b.score).slice(0, 3)

  const sortedStores = [...stores].sort((a, b) => (sortBy === 'score' ? a.score - b.score : a.site_name.localeCompare(b.site_name)))

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
          <Button onClick={() => captureSnapshot.mutate()} disabled={captureSnapshot.isPending}>
            <Camera className="w-[15px] h-[15px]" />
            {captureSnapshot.isPending ? t({ tr: 'Alınıyor…', en: 'Capturing…' }) : t({ tr: 'Anlık Görüntü Al', en: 'Take Snapshot' })}
          </Button>
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
      {pageTab === 'lines-devices' && <LinesDevicesTab stores={stores} period={period} />}
      {pageTab === 'inventory-sla' && <InventorySlaTab stores={stores} period={period} />}
      {pageTab === 'integrations' && <IntegrationsTab />}

      {pageTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-hidden bg-[var(--panel)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h3 className="font-display text-[14px] font-bold">{t({ tr: 'Mağaza Skor Kartı', en: 'Store Scorecard' })}</h3>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'score' | 'name')} className="text-[11.5px] font-semibold bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1">
                <option value="score">{t({ tr: 'Skora göre (düşükten)', en: 'By score (lowest first)' })}</option>
                <option value="name">{t({ tr: 'İsme göre', en: 'By name' })}</option>
              </select>
            </div>
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

          <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
            <h3 className="font-display text-[14px] font-bold mb-3">{t({ tr: 'Skor Dağılımı', en: 'Score Distribution' })}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sortedStores.slice(0, 8).map((s) => ({ name: s.site_name.slice(0, 10), skor: s.score }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-faint)' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} width={70} />
                <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="skor" fill="#17B0A7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <IntegrationStatusWidget onOpenIntegrations={() => setPageTab('integrations')} />
        </div>
      )}

      {pageTab === 'history' && <StoreHistoryTab stores={stores} period={period} onOpenStore={setSelectedStore} />}

      {selectedStore && <StoreDetailDrawer store={selectedStore} period={period} onClose={() => setSelectedStore(null)} />}
    </div>
  )
}

function IntegrationStatusWidget({ onOpenIntegrations }: { onOpenIntegrations: () => void }) {
  const { lang, t } = useLang()
  const { data: summary, isLoading } = useIntegrationSummary()
  const syncNow = useSyncNow()

  return (
    <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-[14px] font-bold">{t({ tr: 'Entegrasyon Durumu', en: 'Integration Status' })}</h3>
        <button
          onClick={() => syncNow.mutate(undefined)}
          disabled={syncNow.isPending}
          title={t({ tr: 'Tümünü Şimdi Senkronize Et', en: 'Sync All Now' })}
          className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-brand-dim hover:bg-[var(--panel-2)] disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncNow.isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {isLoading && <p className="text-[11.5px] text-[var(--text-faint)] text-center py-4">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}
      {!isLoading && !summary?.length && (
        <button onClick={onOpenIntegrations} className="text-[11.5px] text-[var(--text-faint)] hover:text-brand-dim text-left w-full py-2">
          {t({ tr: 'Henüz entegrasyon tanımlanmadı. Kurmak için tıklayın →', en: 'No integrations set up yet. Click to configure →' })}
        </button>
      )}
      <div className="flex flex-col gap-1.5">
        {summary?.map((s) => {
          const Icon = s.last_status === 'success' ? CheckCircle2 : s.last_status === 'error' ? XCircle : Clock
          const cls = s.last_status === 'success' ? 'text-ok' : s.last_status === 'error' ? 'text-p1' : 'text-[var(--text-faint)]'
          return (
            <button key={s.site_id} onClick={onOpenIntegrations} className="flex items-center gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-[var(--row-hover)]">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${cls}`} />
              <span className="text-[12px] flex-1 min-w-0 truncate">{s.site_name}</span>
              <span className="text-[10px] text-[var(--text-faint)] shrink-0">
                {s.last_synced_at ? new Date(s.last_synced_at).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Faz MP-2: bu sekme artık sabit 90 günlük değil, sayfa başlığındaki
 * G/H/A/Y periyot seçicisine göre get_store_score_trend'ten besleniyor —
 * day→son 7 gün, week→son 8 hafta, month→son 12 hafta, year→son 12 ay. */
function StoreHistoryTab({ stores, period, onOpenStore }: { stores: StoreScorecard[]; period: StorePeriod; onOpenStore: (s: StoreScorecard) => void }) {
  const { t } = useLang()
  const [compareSiteId, setCompareSiteId] = useState<string | null>(stores[0]?.site_id ?? null)
  const { data: trend } = useStoreScoreTrend(compareSiteId, period)

  const chartData = trend?.map((p) => ({
    date: p.period_label,
    [t({ tr: 'Skor', en: 'Score' })]: p.score,
  }))

  return (
    <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-[14px] font-bold">{t({ tr: 'Mağaza Geçmiş Trendi', en: 'Store History Trend' })}</h3>
        <select value={compareSiteId ?? ''} onChange={(e) => setCompareSiteId(e.target.value)} className="text-[11.5px] font-semibold bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1.5">
          {stores.map((s) => (
            <option key={s.site_id} value={s.site_id}>
              {s.site_name}
            </option>
          ))}
        </select>
      </div>

      {!chartData?.length && (
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

      {!!stores.length && compareSiteId && (
        <button onClick={() => onOpenStore(stores.find((s) => s.site_id === compareSiteId)!)} className="mt-3 text-[11.5px] font-bold text-brand-dim">
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
