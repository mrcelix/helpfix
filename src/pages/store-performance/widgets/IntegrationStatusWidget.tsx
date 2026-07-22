import { useNavigate } from 'react-router-dom'
import { RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useIntegrationSummary, useSyncNow } from '../useIntegrations'

export function IntegrationStatusWidget() {
  const { lang, t } = useLang()
  const navigate = useNavigate()
  const { data: summary, isLoading } = useIntegrationSummary()
  const syncNow = useSyncNow()

  function openIntegrations() {
    navigate('/store-performance?tab=integrations')
  }

  return (
    <div className="h-full border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3 shrink-0">
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
        <button onClick={openIntegrations} className="text-[11.5px] text-[var(--text-faint)] hover:text-brand-dim text-left w-full py-2">
          {t({ tr: 'Henüz entegrasyon tanımlanmadı. Kurmak için tıklayın →', en: 'No integrations set up yet. Click to configure →' })}
        </button>
      )}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {summary?.map((s) => {
          const Icon = s.last_status === 'success' ? CheckCircle2 : s.last_status === 'error' ? XCircle : Clock
          const cls = s.last_status === 'success' ? 'text-ok' : s.last_status === 'error' ? 'text-p1' : 'text-[var(--text-faint)]'
          return (
            <button key={s.site_id} onClick={openIntegrations} className="flex items-center gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-[var(--row-hover)]">
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
