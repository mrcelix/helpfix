import { useState } from 'react'
import { Plus, RefreshCw, Trash2, CheckCircle2, XCircle, AlertTriangle, Clock, FileText, Power } from 'lucide-react'
import { useLang, type Lang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import {
  useIntegrationEndpoints,
  useUpdateIntegrationEndpoint,
  useDeleteIntegrationEndpoint,
  useSyncNow,
  useIntegrationLogs,
  type IntegrationEndpoint,
} from './useIntegrations'
import { NewIntegrationEndpointModal } from './NewIntegrationEndpointModal'

const STATUS_ICON: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-ok' },
  error: { icon: XCircle, className: 'text-p1' },
  partial: { icon: AlertTriangle, className: 'text-p2' },
}

function timeAgo(iso: string | null, lang: Lang): string {
  if (!iso) return lang === 'tr' ? 'Hiç' : 'Never'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return lang === 'tr' ? 'Az önce' : 'Just now'
  if (mins < 60) return lang === 'tr' ? `${mins} dk önce` : `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return lang === 'tr' ? `${hrs} sa önce` : `${hrs}h ago`
  return lang === 'tr' ? `${Math.round(hrs / 24)} gün önce` : `${Math.round(hrs / 24)}d ago`
}

export function IntegrationsTab() {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const canManage = profile && ['tenant_admin', 'manager'].includes(profile.role)
  const { data: endpoints, isLoading } = useIntegrationEndpoints()
  const [showNewModal, setShowNewModal] = useState(false)
  const [showLogsFor, setShowLogsFor] = useState<string | 'all' | null>(null)
  const syncNow = useSyncNow()

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-display text-[15px] font-bold">{t({ tr: 'Entegrasyonlar', en: 'Integrations' })}</h3>
          <p className="text-[11.5px] text-[var(--text-faint)] mt-0.5 max-w-lg">
            {t({
              tr: 'Mağazalardaki ESL/Kiosk/Network varlıklarını izleyen dış JSON/WebAPI uç noktalarını tanımlayın — belirlediğiniz aralıklarla otomatik senkronize edilir.',
              en: "Define external JSON/WebAPI endpoints that monitor ESL/Kiosk/Network assets at your stores — synced automatically at the interval you set.",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogsFor('all')}
            className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-sub)] hover:border-brand hover:text-brand-dim"
          >
            <FileText className="w-[13px] h-[13px]" />
            {t({ tr: 'Tüm Loglar', en: 'All Logs' })}
          </button>
          {canManage && (
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="w-[15px] h-[15px]" />
              {t({ tr: 'Yeni Uç Nokta', en: 'New Endpoint' })}
            </Button>
          )}
        </div>
      </div>

      {isLoading && <div className="text-[12px] text-[var(--text-faint)] py-10 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>}
      {!isLoading && !endpoints?.length && (
        <div className="text-[12px] text-[var(--text-faint)] py-12 text-center px-6 border border-dashed border-[var(--border)] rounded-xl">
          {t({
            tr: 'Henüz entegrasyon uç noktası tanımlanmadı. "Yeni Uç Nokta" ile bir mağazanın ESL/Kiosk/Network izleme sisteminin JSON API adresini ekleyin.',
            en: "No integration endpoints defined yet. Add a JSON API URL from a store's ESL/Kiosk/Network monitoring system with \"New Endpoint\".",
          })}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {endpoints?.map((ep) => (
          <EndpointRow key={ep.id} endpoint={ep} lang={lang} t={t} canManage={!!canManage} onViewLogs={() => setShowLogsFor(ep.id)} syncNow={syncNow} />
        ))}
      </div>

      {showNewModal && <NewIntegrationEndpointModal onClose={() => setShowNewModal(false)} />}
      {showLogsFor && <LogsModal endpointId={showLogsFor === 'all' ? undefined : showLogsFor} onClose={() => setShowLogsFor(null)} />}
    </div>
  )
}

function EndpointRow({
  endpoint: ep,
  lang,
  t,
  canManage,
  onViewLogs,
  syncNow,
}: {
  endpoint: IntegrationEndpoint
  lang: Lang
  t: (d: { tr: string; en: string }) => string
  canManage: boolean
  onViewLogs: () => void
  syncNow: ReturnType<typeof useSyncNow>
}) {
  const updateEndpoint = useUpdateIntegrationEndpoint()
  const deleteEndpoint = useDeleteIntegrationEndpoint()
  const StatusIcon = ep.last_status ? (STATUS_ICON[ep.last_status]?.icon ?? Clock) : Clock
  const statusClass = ep.last_status ? (STATUS_ICON[ep.last_status]?.className ?? 'text-[var(--text-faint)]') : 'text-[var(--text-faint)]'

  function handleDelete() {
    if (confirm(t({ tr: `"${ep.name}" uç noktasını silmek istediğinize emin misiniz?`, en: `Delete endpoint "${ep.name}"?` }))) {
      deleteEndpoint.mutate(ep.id)
    }
  }

  return (
    <div className="flex items-center gap-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-4 py-3">
      <StatusIcon className={`w-4 h-4 shrink-0 ${statusClass}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold flex items-center gap-1.5">
          {ep.name}
          {!ep.is_active && (
            <span className="text-[9px] font-bold bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text-faint)] rounded-full px-1.5 py-0.5">
              {t({ tr: 'PASİF', en: 'INACTIVE' })}
            </span>
          )}
        </div>
        <div className="text-[11px] text-[var(--text-faint)] mt-0.5 truncate">
          {ep.site?.name ?? '—'} · {ep.http_method} {ep.endpoint_url} · {t({ tr: `${ep.poll_interval_minutes} dk'da bir`, en: `every ${ep.poll_interval_minutes}m` })}
        </div>
      </div>
      <span className="text-[10.5px] text-[var(--text-faint)] shrink-0 hidden sm:block">{timeAgo(ep.last_synced_at, lang)}</span>
      <button
        onClick={() => syncNow.mutate(ep.id)}
        disabled={syncNow.isPending}
        title={t({ tr: 'Şimdi Senkronize Et', en: 'Sync Now' })}
        className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-brand-dim hover:bg-[var(--panel-2)] disabled:opacity-40 shrink-0"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${syncNow.isPending ? 'animate-spin' : ''}`} />
      </button>
      <button
        onClick={onViewLogs}
        title={t({ tr: 'Logları Gör', en: 'View Logs' })}
        className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-brand-dim hover:bg-[var(--panel-2)] shrink-0"
      >
        <FileText className="w-3.5 h-3.5" />
      </button>
      {canManage && (
        <button
          onClick={() => updateEndpoint.mutate({ id: ep.id, isActive: !ep.is_active })}
          title={ep.is_active ? t({ tr: 'Pasifleştir', en: 'Deactivate' }) : t({ tr: 'Aktifleştir', en: 'Activate' })}
          aria-label={ep.is_active ? t({ tr: 'Pasifleştir', en: 'Deactivate' }) : t({ tr: 'Aktifleştir', en: 'Activate' })}
          aria-pressed={ep.is_active}
          className={`p-1.5 rounded-md hover:bg-[var(--panel-2)] shrink-0 ${ep.is_active ? 'text-ok' : 'text-[var(--text-faint)]'}`}
        >
          <Power className="w-3.5 h-3.5" />
        </button>
      )}
      {canManage && (
        <button
          onClick={handleDelete}
          title={t({ tr: 'Sil', en: 'Delete' })}
          aria-label={t({ tr: 'Sil', en: 'Delete' })}
          className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-p1 hover:bg-[var(--panel-2)] shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

function LogsModal({ endpointId, onClose }: { endpointId: string | undefined; onClose: () => void }) {
  const { lang, t } = useLang()
  const { data: logs, isLoading } = useIntegrationLogs(endpointId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl w-full max-w-[640px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-display text-[15px] font-bold">{t({ tr: 'Entegrasyon Logları', en: 'Integration Logs' })}</h3>
          <button
            onClick={onClose}
            title={t({ tr: 'Kapat', en: 'Close' })}
            aria-label={t({ tr: 'Kapat', en: 'Close' })}
            className="text-[var(--text-faint)] hover:text-[var(--text)] text-[13px]"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-1.5">
          {isLoading && <p className="text-[12px] text-[var(--text-faint)] text-center py-8">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}
          {!isLoading && !logs?.length && <p className="text-[12px] text-[var(--text-faint)] text-center py-8">{t({ tr: 'Henüz log kaydı yok.', en: 'No log entries yet.' })}</p>}
          {logs?.map((log) => {
            const Icon = STATUS_ICON[log.status]?.icon ?? Clock
            const cls = STATUS_ICON[log.status]?.className ?? 'text-[var(--text-faint)]'
            return (
              <div key={log.id} className="flex items-start gap-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5">
                <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cls}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold flex items-center gap-1.5 flex-wrap">
                    <span>{log.endpoint?.name ?? '—'}</span>
                    <span className="text-[var(--text-faint)] font-normal">· {log.endpoint?.site?.name ?? '—'}</span>
                    {log.http_status && <span className="font-mono text-[10.5px] text-[var(--text-faint)]">HTTP {log.http_status}</span>}
                    {log.duration_ms != null && <span className="font-mono text-[10.5px] text-[var(--text-faint)]">{log.duration_ms}ms</span>}
                  </div>
                  {log.message && <div className="text-[11px] text-[var(--text-sub)] mt-0.5">{log.message}</div>}
                </div>
                <span className="text-[10px] text-[var(--text-faint)] shrink-0">{new Date(log.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
