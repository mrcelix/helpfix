import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLang } from '@/contexts/LangContext'
import { useAlerts, useDailyAlertVolume, useAcknowledgeAlert, useResolveAlert, useMttaBySource, useRunbooks, findMatchingRunbook, type AlertSavedView } from './useMonitoring'
import { CreateIncidentModal } from './CreateIncidentModal'
import { RunbooksModal } from './RunbooksModal'

const SAVED_VIEWS: { key: AlertSavedView; label: { tr: string; en: string } }[] = [
  { key: 'firing', label: { tr: 'Ateşleniyor', en: 'Firing' } },
  { key: 'acknowledged', label: { tr: 'Onaylandı', en: 'Acknowledged' } },
  { key: 'critical', label: { tr: 'Kritik', en: 'Critical' } },
  { key: 'all', label: { tr: 'Tümü', en: 'All' } },
]

const SOURCE_COLOR: Record<string, string> = {
  datadog: 'bg-purple-tint text-purple',
  zabbix: 'bg-p3-tint text-[#8CA3FF]',
  prometheus: 'bg-p2-tint text-p2',
  cloudwatch: 'bg-p2-tint text-p2',
  manual: 'bg-[var(--panel-2)] text-[var(--text-faint)] border border-[var(--border)]',
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-p1-tint text-p1',
  warning: 'bg-p2-tint text-p2',
  info: 'bg-[var(--panel-2)] text-[var(--text-faint)] border border-[var(--border)]',
}

export function MonitoringPage() {
  const { lang, t } = useLang()
  const [view, setView] = useState<AlertSavedView>('firing')
  const [incidentModalAlert, setIncidentModalAlert] = useState<{ id: string; title: string } | null>(null)
  const [showRunbooksModal, setShowRunbooksModal] = useState(false)

  const { data: alerts, isLoading } = useAlerts(view)
  const { data: volume } = useDailyAlertVolume()
  const { data: mtta } = useMttaBySource()
  const { data: runbooks } = useRunbooks()
  const acknowledgeAlert = useAcknowledgeAlert()
  const resolveAlert = useResolveAlert()

  const chartData = volume?.map((v) => ({
    day: new Date(v.day).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' }),
    [t({ tr: 'Uyarı', en: 'Alerts' })]: v.alert_count,
    [t({ tr: 'Kritik', en: 'Critical' })]: v.critical_count,
  }))

  return (
    <div>
      <div className="mb-5 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {t({ tr: 'Olay/İzleme', en: 'Monitoring' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Çoklu kaynak uyarıları ve gürültü trendi', en: 'Multi-source alerts and noise trend' })}
          </p>
        </div>
        <button
          onClick={() => setShowRunbooksModal(true)}
          className="text-[12px] font-semibold px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-sub)] hover:border-brand hover:text-brand-dim"
        >
          📖 {t({ tr: "Runbook'lar", en: 'Runbooks' })}
        </button>
      </div>

      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 mb-5">
        <div className="text-[13px] font-bold mb-4">{t({ tr: 'Günlük Uyarı Hacmi (14 gün)', en: 'Daily Alert Volume (14d)' })}</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey={t({ tr: 'Uyarı', en: 'Alerts' })} fill="#4C6FFF" radius={[4, 4, 0, 0]} />
            <Bar dataKey={t({ tr: 'Kritik', en: 'Critical' })} fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {!!mtta?.length && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {mtta.map((m) => (
            <div key={m.source} className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-3.5">
              <div className={`inline-block text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md mb-1.5 ${SOURCE_COLOR[m.source]}`}>{m.source}</div>
              <div className="font-display text-lg font-bold">{m.avg_minutes} {t({ tr: 'dk', en: 'min' })}</div>
              <div className="text-[10px] text-[var(--text-faint)]">{t({ tr: `MTTA · ${m.alert_count} uyarı`, en: `MTTA · ${m.alert_count} alerts` })}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {SAVED_VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={
              'text-[12.5px] font-bold px-3.5 py-2 rounded-lg border transition-colors ' +
              (view === v.key
                ? 'bg-brand border-brand text-white'
                : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]')
            }
          >
            {v.label[lang]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-[var(--text-faint)] text-sm py-8 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}
        {!isLoading && alerts?.length === 0 && (
          <p className="text-[var(--text-faint)] text-sm py-14 text-center">{t({ tr: 'Bu görünümde uyarı yok.', en: 'No alerts in this view.' })}</p>
        )}
        {alerts?.map((a) => {
          const runbook = findMatchingRunbook(a.title, runbooks)
          return (
          <div key={a.id} className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-3.5">
          <div className="flex items-center gap-3">
            <span className={`text-[9.5px] font-bold uppercase px-2 py-1 rounded-md ${SOURCE_COLOR[a.source]}`}>{a.source}</span>
            <span className={`text-[9.5px] font-bold uppercase px-2 py-1 rounded-md ${SEVERITY_STYLE[a.severity]}`}>{a.severity}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold truncate">{a.title}</div>
              <div className="text-[10.5px] text-[var(--text-faint)]">
                {a.ci?.name ?? '—'} · {new Date(a.fired_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {a.status === 'firing' && (
                <button onClick={() => acknowledgeAlert.mutate(a.id)} className="text-[10.5px] font-bold px-2.5 py-1.5 rounded-md bg-p2-tint text-p2">
                  {t({ tr: 'Onayla', en: 'Ack' })}
                </button>
              )}
              {a.status !== 'resolved' && (
                <button onClick={() => resolveAlert.mutate(a.id)} className="text-[10.5px] font-bold px-2.5 py-1.5 rounded-md bg-[#0F2E1F] text-ok">
                  {t({ tr: 'Çözüldü', en: 'Resolve' })}
                </button>
              )}
              {!a.incident_id ? (
                <button
                  onClick={() => setIncidentModalAlert({ id: a.id, title: a.title })}
                  className="text-[10.5px] font-bold px-2.5 py-1.5 rounded-md bg-brand text-white"
                >
                  {t({ tr: 'Olay Oluştur', en: 'Create Incident' })}
                </button>
              ) : (
                <span className="text-[10.5px] font-bold px-2.5 py-1.5 rounded-md bg-[var(--panel-2)] text-[var(--text-faint)] border border-[var(--border)]">
                  {t({ tr: 'Olay bağlı', en: 'Incident linked' })}
                </span>
              )}
            </div>
          </div>
          {runbook && (
            <details className="mt-2.5 pt-2.5 border-t border-[var(--border)]">
              <summary className="text-[10.5px] font-bold text-purple cursor-pointer">📖 {runbook.title}</summary>
              <div className="text-[11.5px] text-[var(--text-sub)] whitespace-pre-wrap mt-2 pl-1">{runbook.steps}</div>
            </details>
          )}
          </div>
          )
        })}
      </div>

      {incidentModalAlert && <CreateIncidentModal alert={incidentModalAlert} onClose={() => setIncidentModalAlert(null)} />}
      {showRunbooksModal && <RunbooksModal onClose={() => setShowRunbooksModal(false)} />}
    </div>
  )
}
