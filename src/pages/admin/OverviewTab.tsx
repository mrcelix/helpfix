import { Users, Building2, Puzzle, Store, Sparkles, Activity, ArrowRight } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useTenantUsers, useDepartments, useFeatureFlags, useAuditLog, useAiQuota, useAiUsageThisMonth } from './useAdmin'
import { useSites } from './useSites'
import { NAV_MODULES } from '@/components/layout/nav-modules'

export function OverviewTab({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  const { lang, t } = useLang()
  const { data: users } = useTenantUsers()
  const { data: departments } = useDepartments()
  const { data: flags } = useFeatureFlags()
  const { data: sites } = useSites()
  const { data: auditLog } = useAuditLog()
  const { data: quota } = useAiQuota()
  const { data: aiUsage } = useAiUsageThisMonth()

  const activeUsers = users?.filter((u) => u.is_active).length ?? 0
  const activeModuleCount = NAV_MODULES.filter((m) => flags?.[m.code] ?? true).length
  const aiUsedTotal = aiUsage?.reduce((sum, row) => sum + Number(row.call_count), 0) ?? 0
  const aiPct = quota ? Math.min((aiUsedTotal / quota) * 100, 100) : 0

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <OverviewCard
          icon={Users}
          label={t({ tr: 'Aktif Kullanıcı', en: 'Active Users' })}
          value={activeUsers}
          sub={`${users?.length ?? 0} ${t({ tr: 'toplam', en: 'total' })}`}
          onClick={() => onNavigateTab('users')}
        />
        <OverviewCard
          icon={Building2}
          label={t({ tr: 'Departman', en: 'Departments' })}
          value={departments?.length ?? 0}
          onClick={() => onNavigateTab('departments')}
        />
        <OverviewCard
          icon={Puzzle}
          label={t({ tr: 'Aktif Modül', en: 'Active Modules' })}
          value={activeModuleCount}
          sub={`/ ${NAV_MODULES.length}`}
          onClick={() => onNavigateTab('modules')}
        />
        <OverviewCard
          icon={Store}
          label={t({ tr: 'Site / Mağaza', en: 'Sites / Stores' })}
          value={sites?.length ?? 0}
          onClick={() => onNavigateTab('sites')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-[14px] font-bold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-brand-dim" />
              {t({ tr: 'Son Aktivite', en: 'Recent Activity' })}
            </h3>
            <button onClick={() => onNavigateTab('audit')} className="flex items-center gap-1 text-[11px] font-bold text-brand-dim">
              {t({ tr: 'Tümünü Gör', en: 'View All' })}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {!auditLog?.length && <p className="text-[12px] text-[var(--text-faint)] italic py-4">{t({ tr: 'Henüz aktivite yok.', en: 'No activity yet.' })}</p>}
            {auditLog?.slice(0, 8).map((entry) => (
              <div key={entry.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--row-hover)]">
                <div className="w-6 h-6 rounded-full bg-[var(--panel-2)] border border-[var(--border)] flex items-center justify-center text-[9px] font-bold shrink-0">
                  {entry.actor?.full_name?.slice(0, 2).toUpperCase() ?? '—'}
                </div>
                <div className="flex-1 min-w-0 text-[12px]">
                  <span className="font-semibold">{entry.actor?.full_name ?? t({ tr: 'Sistem', en: 'System' })}</span>{' '}
                  <span className="text-[var(--text-faint)]">{entry.action}</span>{' '}
                  {entry.target_label && <span className="font-medium">{entry.target_label}</span>}
                </div>
                <span className="text-[10.5px] text-[var(--text-faint)] shrink-0">
                  {new Date(entry.created_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
          <h3 className="font-display text-[14px] font-bold flex items-center gap-1.5 mb-3">
            <Sparkles className="w-4 h-4 text-brand-dim" />
            {t({ tr: 'AI Kullanımı (Bu Ay)', en: 'AI Usage (This Month)' })}
          </h3>
          <div className="flex items-end justify-between mb-1.5">
            <span className="font-display text-2xl font-bold">
              {aiUsedTotal} <span className="text-[13px] font-normal text-[var(--text-faint)]">/ {quota ?? 500}</span>
            </span>
            <span className={`text-[12px] font-bold ${aiPct >= 100 ? 'text-p1' : aiPct >= 80 ? 'text-p2' : 'text-ok'}`}>%{aiPct.toFixed(0)}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--panel-2)] border border-[var(--border)] overflow-hidden mb-3">
            <div className={`h-full ${aiPct >= 100 ? 'bg-p1' : aiPct >= 80 ? 'bg-p2' : 'bg-ok'}`} style={{ width: `${aiPct}%` }} />
          </div>
          <button onClick={() => onNavigateTab('ai')} className="flex items-center gap-1 text-[11px] font-bold text-brand-dim">
            {t({ tr: 'Detaylara Git', en: 'View Details' })}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  sub?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 hover:border-brand/40 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-brand-tint flex items-center justify-center">
          <Icon className="w-4 h-4 text-brand-dim" />
        </div>
      </div>
      <div className="font-display text-2xl font-bold">
        {value}
        {sub && <span className="text-[12px] font-normal text-[var(--text-faint)] ml-1">{sub}</span>}
      </div>
      <div className="text-[11px] text-[var(--text-faint)] mt-0.5">{label}</div>
    </button>
  )
}
