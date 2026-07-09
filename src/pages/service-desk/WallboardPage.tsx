import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, AlertTriangle } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { PRIORITY_LABEL } from '@/lib/priority'
import { computeSlaMeter } from './useServiceDeskExtras'
import { useWallboardIncidents, useWallboardResolvedToday, useWallboardMajorIncidents } from './useWallboard'
import type { Priority } from '@/types/database'

const PRIORITY_ACCENT: Record<Priority, string> = {
  P1: 'text-p1',
  P2: 'text-p2',
  P3: 'text-[#8CA3FF]',
  P4: 'text-p4',
}

export function WallboardPage() {
  const { lang, t } = useLang()
  const navigate = useNavigate()
  const { data: incidents, dataUpdatedAt } = useWallboardIncidents()
  const { data: resolvedToday } = useWallboardResolvedToday()
  const { data: majorIncidents } = useWallboardMajorIncidents()

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const priorities: Priority[] = ['P1', 'P2', 'P3', 'P4']
  const counts = priorities.reduce(
    (acc, p) => {
      acc[p] = incidents?.filter((i) => i.priority === p).length ?? 0
      return acc
    },
    {} as Record<Priority, number>
  )

  const slaRisk = (incidents ?? [])
    .filter((i) => i.sla_due_at)
    .map((i) => ({ incident: i, meter: computeSlaMeter(i.created_at, i.sla_due_at!) }))
    .sort((a, b) => {
      const aOver = a.meter.level === 'breached'
      const bOver = b.meter.level === 'breached'
      if (aOver !== bOver) return aOver ? -1 : 1
      return new Date(a.incident.sla_due_at!).getTime() - new Date(b.incident.sla_due_at!).getTime()
    })
    .slice(0, 12)

  return (
    <div className="min-h-screen bg-app text-[var(--text)] p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-tight">
            {t({ tr: 'Servis Masası — Canlı Pano', en: 'Service Desk — Live Wallboard' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-0.5">
            {now.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', day: '2-digit', month: 'long' })} ·{' '}
            {now.toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US')}
          </p>
        </div>
        <button
          onClick={() => navigate('/service-desk')}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border)] text-[var(--text-faint)] hover:text-p1 hover:border-p1 transition-colors"
          title={t({ tr: 'Panodan çık', en: 'Exit wallboard' })}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!!majorIncidents?.length && (
        <div className="bg-p1-tint border-2 border-p1 rounded-2xl px-6 py-4 flex items-center gap-4 animate-pulse">
          <AlertTriangle className="w-7 h-7 text-p1 shrink-0" />
          <div>
            <div className="text-[15px] font-bold text-p1">
              {t({ tr: 'BÜYÜK OLAY AKTİF', en: 'MAJOR INCIDENT ACTIVE' })} ({majorIncidents.length})
            </div>
            <div className="text-[13px] text-[var(--text-sub)] mt-0.5">
              {majorIncidents.map((m) => `${m.ref} — ${m.title}`).join('  ·  ')}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-6 gap-4">
        {priorities.map((p) => (
          <div key={p} className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 text-center">
            <div className={`font-display text-5xl font-bold ${PRIORITY_ACCENT[p]}`}>{counts[p]}</div>
            <div className="text-[13px] text-[var(--text-faint)] mt-2 font-semibold">{PRIORITY_LABEL[p][lang]}</div>
          </div>
        ))}
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 text-center">
          <div className="font-display text-5xl font-bold">{incidents?.length ?? 0}</div>
          <div className="text-[13px] text-[var(--text-faint)] mt-2 font-semibold">{t({ tr: 'Toplam Açık', en: 'Total Open' })}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 text-center">
          <div className="font-display text-5xl font-bold text-ok">{resolvedToday ?? 0}</div>
          <div className="text-[13px] text-[var(--text-faint)] mt-2 font-semibold">{t({ tr: 'Bugün Çözülen', en: 'Resolved Today' })}</div>
        </div>
      </div>

      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 flex-1">
        <div className="text-[16px] font-bold mb-4">{t({ tr: 'SLA Riski En Yüksek Kayıtlar', en: 'Highest SLA Risk Records' })}</div>
        {!slaRisk.length && (
          <p className="text-[14px] text-[var(--text-faint)] text-center py-12">
            {t({ tr: 'SLA riski taşıyan açık kayıt yok. 🎉', en: 'No open records at SLA risk. 🎉' })}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {slaRisk.map(({ incident, meter }) => (
            <div
              key={incident.id}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                meter.level === 'breached'
                  ? 'bg-p1-tint border-p1/50'
                  : meter.level === 'danger'
                    ? 'bg-p1-tint/50 border-p1/30'
                    : meter.level === 'warn'
                      ? 'bg-p2-tint border-p2/30'
                      : 'bg-[var(--panel-2)] border-[var(--border)]'
              }`}
            >
              <span className="font-mono text-[11px] text-[var(--text-faint)] shrink-0">{incident.ref}</span>
              <span className="text-[13px] font-semibold flex-1 truncate">{incident.title}</span>
              <span className="text-[10.5px] font-bold text-[var(--text-faint)] shrink-0">{incident.assignee?.full_name ?? '—'}</span>
              <span
                className={`text-[11px] font-bold shrink-0 ${
                  meter.level === 'breached' || meter.level === 'danger' ? 'text-p1' : meter.level === 'warn' ? 'text-p2' : 'text-[var(--text-faint)]'
                }`}
              >
                {meter.level === 'breached'
                  ? t({ tr: `${meter.remainingLabel} ihlal`, en: `${meter.remainingLabel} overdue` })
                  : t({ tr: `${meter.remainingLabel} kaldı`, en: `${meter.remainingLabel} left` })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-[11px] text-[var(--text-faint)]">
        {t({ tr: 'Son güncelleme: ', en: 'Last updated: ' })}
        {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US') : '—'}
        {' · '}
        {t({ tr: '20 saniyede bir otomatik yenilenir', en: 'Auto-refreshes every 20 seconds' })}
      </div>
    </div>
  )
}
