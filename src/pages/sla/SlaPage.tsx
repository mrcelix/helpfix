import { useState } from 'react'
import { Plus, ArrowUpCircle } from 'lucide-react'
import { useLang, type Lang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { PriorityBadge } from '@/components/ui/Badge'
import { usePolicies, useMonitoredIncidents, useTogglePolicy, useAllEscalationLevels, computeTriggeredLevel, type MonitoredIncident } from './useSla'
import { NewPolicyModal } from './NewPolicyModal'
import { EscalationMatrixModal } from './EscalationMatrixModal'
import { BusinessCalendarTab } from './BusinessCalendarTab'

function slaState(incident: MonitoredIncident, warningPercent: number): 'ok' | 'warning' | 'breached' {
  if (!incident.sla_due_at) return 'ok'
  const remainingMs = new Date(incident.sla_due_at).getTime() - Date.now()
  if (remainingMs < 0) return 'breached'
  const totalMs = new Date(incident.sla_due_at).getTime() - new Date(incident.created_at).getTime()
  if (totalMs > 0 && remainingMs / totalMs < 1 - warningPercent / 100) return 'warning'
  return 'ok'
}

function formatCountdown(dueAt: string, lang: Lang): string {
  const diffMs = new Date(dueAt).getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const hours = Math.floor(abs / 3_600_000)
  const mins = Math.floor((abs % 3_600_000) / 60_000)
  const text = `${hours}s ${mins}dk`
  const textEn = `${hours}h ${mins}m`
  return diffMs < 0
    ? lang === 'tr'
      ? `${text} gecikti`
      : `${textEn} overdue`
    : lang === 'tr'
      ? `${text} kaldı`
      : `${textEn} left`
}

const STATE_STYLE: Record<string, string> = {
  ok: 'text-ok bg-[#0F2E1F]',
  warning: 'text-p2 bg-p2-tint',
  breached: 'text-p1 bg-p1-tint',
}

export function SlaPage() {
  const { lang, t } = useLang()
  const [tab, setTab] = useState<'monitor' | 'policies' | 'calendar'>('monitor')
  const [showNewModal, setShowNewModal] = useState(false)
  const [escalationPolicy, setEscalationPolicy] = useState<{ id: string; name: string } | null>(null)

  const { data: incidents, isLoading: incidentsLoading, error: incidentsError } = useMonitoredIncidents()
  const { data: policies, isLoading: policiesLoading, error: policiesError } = usePolicies()
  const { data: escalationLevels } = useAllEscalationLevels()
  const togglePolicy = useTogglePolicy()

  const warningPercentByPolicy = new Map((policies ?? []).map((p) => [p.id, p.escalation_warning_percent]))
  const warningPercentFor = (i: MonitoredIncident) => (i.sla_policy_id && warningPercentByPolicy.get(i.sla_policy_id)) || 80

  const breachedCount = incidents?.filter((i) => slaState(i, warningPercentFor(i)) === 'breached').length ?? 0
  const warningCount = incidents?.filter((i) => slaState(i, warningPercentFor(i)) === 'warning').length ?? 0

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {t({ tr: 'SLA Yönetimi', en: 'SLA Management' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Öncelik bazlı politikalar ve canlı ihlal takibi', en: 'Priority-based policies and live breach tracking' })}
          </p>
        </div>
        {tab === 'policies' && (
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="w-[15px] h-[15px]" />
            {t({ tr: 'Yeni Politika', en: 'New Policy' })}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3.5 mb-5">
        <KpiCard label={t({ tr: 'İhlal Edilen', en: 'Breached' })} value={breachedCount} color="text-p1" />
        <KpiCard label={t({ tr: 'Riskte (< %20 kaldı)', en: 'At Risk (< 20% left)' })} value={warningCount} color="text-p2" />
        <KpiCard label={t({ tr: 'Aktif Politika', en: 'Active Policies' })} value={policies?.filter((p) => p.is_active).length ?? 0} color="text-brand" />
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] mb-5 overflow-x-auto">
        <button
          onClick={() => setTab('monitor')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${tab === 'monitor' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Canlı İzleme', en: 'Live Monitoring' })}
        </button>
        <button
          onClick={() => setTab('policies')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${tab === 'policies' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Politikalar', en: 'Policies' })}
        </button>
        <button
          onClick={() => setTab('calendar')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${tab === 'calendar' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'İş Takvimi', en: 'Business Calendar' })}
        </button>
      </div>

      {tab === 'monitor' && (
        <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-x-auto bg-[var(--panel)]">
          <table className="w-full text-[12.5px] min-w-[720px]">
            <thead>
              <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
                <Th>{t({ tr: 'Ref', en: 'Ref' })}</Th>
                <Th>{t({ tr: 'Başlık', en: 'Title' })}</Th>
                <Th>{t({ tr: 'Öncelik', en: 'Priority' })}</Th>
                <Th>{t({ tr: 'SLA Durumu', en: 'SLA Status' })}</Th>
                <Th>{t({ tr: 'Eskalasyon', en: 'Escalation' })}</Th>
              </tr>
            </thead>
            <tbody>
              {incidentsLoading && (
                <tr><td colSpan={5} className="text-center py-10 text-[var(--text-faint)]">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</td></tr>
              )}
              {incidentsError && (
                <tr><td colSpan={5} className="text-center py-10 text-p1">{t({ tr: 'Bir hata oluştu.', en: 'Something went wrong.' })}</td></tr>
              )}
              {!incidentsLoading && !incidentsError && incidents?.length === 0 && (
                <tr><td colSpan={5} className="text-center py-14 text-[var(--text-faint)]">{t({ tr: 'İzlenecek açık kayıt yok.', en: 'No open records to monitor.' })}</td></tr>
              )}
              {incidents?.map((i) => {
                const state = slaState(i, warningPercentFor(i))
                const triggeredLevel = escalationLevels ? computeTriggeredLevel(i, escalationLevels) : null
                return (
                  <tr key={i.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--row-hover)]">
                    <td className="px-3.5 py-3 font-mono text-[var(--text-faint)]">{i.ref}</td>
                    <td className="px-3.5 py-3 font-semibold">{i.title}</td>
                    <td className="px-3.5 py-3"><PriorityBadge priority={i.priority} lang={lang} /></td>
                    <td className="px-3.5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATE_STYLE[state]}`}>
                        {i.sla_due_at ? formatCountdown(i.sla_due_at, lang) : '—'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      {triggeredLevel ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-purple bg-purple-tint rounded-full px-2 py-0.5">
                          <ArrowUpCircle className="w-3 h-3" />
                          {t({ tr: `Seviye ${triggeredLevel.level}`, en: `Level ${triggeredLevel.level}` })}
                        </span>
                      ) : (
                        <span className="text-[var(--text-faint)]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'policies' && (
        <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-x-auto bg-[var(--panel)]">
          <table className="w-full text-[12.5px] min-w-[720px]">
            <thead>
              <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
                <Th>{t({ tr: 'Ad', en: 'Name' })}</Th>
                <Th>{t({ tr: 'Öncelik', en: 'Priority' })}</Th>
                <Th>{t({ tr: 'Yanıt Süresi', en: 'Response Time' })}</Th>
                <Th>{t({ tr: 'Çözüm Süresi', en: 'Resolution Time' })}</Th>
                <Th>{t({ tr: 'Aktif', en: 'Active' })}</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {policiesLoading && (
                <tr><td colSpan={6} className="text-center py-10 text-[var(--text-faint)]">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</td></tr>
              )}
              {policiesError && (
                <tr><td colSpan={6} className="text-center py-10 text-p1">{t({ tr: 'Bir hata oluştu.', en: 'Something went wrong.' })}</td></tr>
              )}
              {!policiesLoading && !policiesError && policies?.length === 0 && (
                <tr><td colSpan={6} className="text-center py-14 text-[var(--text-faint)]">{t({ tr: 'Henüz politika yok.', en: 'No policies yet.' })}</td></tr>
              )}
              {policies?.map((p) => (
                <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3.5 py-3 font-semibold">
                    {p.name}
                    <span className="ml-2 text-[9px] font-mono font-bold bg-purple-tint text-purple rounded-full px-1.5 py-0.5">{p.tier.toUpperCase()}</span>
                    {p.category && (
                      <span className="ml-1.5 text-[9px] font-bold bg-brand-tint text-brand-dim rounded-full px-1.5 py-0.5">{p.category}</span>
                    )}
                    {p.site && (
                      <span className="ml-1.5 text-[9px] font-bold bg-p2-tint text-p2 rounded-full px-1.5 py-0.5">📍 {p.site.name}</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3"><PriorityBadge priority={p.priority} lang={lang} /></td>
                  <td className="px-3.5 py-3 text-[var(--text-sub)]">{p.response_time_minutes} {t({ tr: 'dk', en: 'min' })}</td>
                  <td className="px-3.5 py-3 text-[var(--text-sub)]">{p.resolution_time_minutes} {t({ tr: 'dk', en: 'min' })}</td>
                  <td className="px-3.5 py-3">
                    <button
                      onClick={() => togglePolicy.mutate({ id: p.id, is_active: !p.is_active })}
                      aria-pressed={p.is_active}
                      title={p.is_active ? t({ tr: 'Aktif — devre dışı bırak', en: 'Active — deactivate' }) : t({ tr: 'Pasif — etkinleştir', en: 'Inactive — activate' })}
                      aria-label={p.is_active ? t({ tr: 'Aktif — devre dışı bırak', en: 'Active — deactivate' }) : t({ tr: 'Pasif — etkinleştir', en: 'Inactive — activate' })}
                      className={`w-9 h-5 rounded-full relative transition-colors ${p.is_active ? 'bg-ok' : 'bg-[var(--border)]'}`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${p.is_active ? 'left-[18px]' : 'left-0.5'}`}
                      />
                    </button>
                  </td>
                  <td className="px-3.5 py-3">
                    <button
                      onClick={() => setEscalationPolicy({ id: p.id, name: p.name })}
                      className="text-[10.5px] font-bold text-purple whitespace-nowrap"
                    >
                      {t({ tr: 'Eskalasyon Matrisi', en: 'Escalation Matrix' })}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'calendar' && <BusinessCalendarTab />}

      {showNewModal && <NewPolicyModal onClose={() => setShowNewModal(false)} />}
      {escalationPolicy && (
        <EscalationMatrixModal
          policyId={escalationPolicy.id}
          policyName={escalationPolicy.name}
          onClose={() => setEscalationPolicy(null)}
        />
      )}
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4">
      <div className={`font-display text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[11px] text-[var(--text-faint)] mt-1">{label}</div>
    </div>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">
      {children}
    </th>
  )
}
