import { useState, useEffect, useMemo } from 'react'
import { useOpenParam } from '@/hooks/useOpenParam'
import { Plus, Snowflake, Download } from 'lucide-react'
import { useLang, pickLang} from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { useChanges, type ChangeSavedView } from './useChanges'
import { ChangeDrawer } from './ChangeDrawer'
import { NewChangeModal } from './NewChangeModal'
import { FreezeWindowsModal } from './FreezeWindowsModal'
import { ChangeTemplatesModal } from './ChangeTemplatesModal'
import { ChangeAnalytics } from './ChangeAnalytics'
import { ChangeCalendarTab } from './ChangeCalendarTab'

const SAVED_VIEWS: { key: ChangeSavedView; label: { tr: string; en: string } }[] = [
  { key: 'all', label: { tr: 'Tümü', en: 'All' } },
  { key: 'scheduled', label: { tr: 'Planlanan', en: 'Scheduled' } },
  { key: 'high_risk', label: { tr: 'Yüksek Risk', en: 'High Risk' } },
]

const STATUS_LABEL: Record<string, { tr: string; en: string }> = {
  draft: { tr: 'Taslak', en: 'Draft' },
  submitted: { tr: 'Gönderildi', en: 'Submitted' },
  technical_review: { tr: 'Teknik İnceleme', en: 'Technical Review' },
  cab_review: { tr: 'CAB İncelemesi', en: 'CAB Review' },
  approved: { tr: 'Onaylandı', en: 'Approved' },
  scheduled: { tr: 'Planlandı', en: 'Scheduled' },
  in_progress: { tr: 'Uygulanıyor', en: 'In Progress' },
  completed: { tr: 'Tamamlandı', en: 'Completed' },
  failed: { tr: 'Başarısız', en: 'Failed' },
  closed: { tr: 'Kapatıldı', en: 'Closed' },
}

const TYPE_LABEL: Record<string, { tr: string; en: string }> = {
  standard: { tr: 'Standart', en: 'Standard' },
  normal: { tr: 'Normal', en: 'Normal' },
  emergency: { tr: 'Acil', en: 'Emergency' },
}

function riskColor(score: number) {
  if (score >= 60) return 'text-p1 bg-p1-tint'
  if (score >= 31) return 'text-p2 bg-p2-tint'
  return 'text-ok bg-[#0F2E1F]'
}

export function ChangesPage() {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const canManage = profile && ['tenant_admin', 'manager'].includes(profile.role)
  const [view, setView] = useState<ChangeSavedView>('all')
  const [pageTab, setPageTab] = useState<'changes' | 'calendar' | 'analytics'>('changes')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const openId = useOpenParam()
  useEffect(() => { if (openId) setSelectedId(openId) }, [openId])
  const [showNewModal, setShowNewModal] = useState(false)
  const [showFreezeModal, setShowFreezeModal] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)

  const { data: changes, isLoading, error } = useChanges(view)
  const [sortBy, setSortBy] = useState<'created_desc' | 'risk' | 'az'>('created_desc')

  const sortedChanges = useMemo(() => changes ? [...changes].sort((a, b) => {
    if (sortBy === 'risk') return b.risk_score - a.risk_score
    if (sortBy === 'az') return a.title.localeCompare(b.title)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }) : changes, [changes, sortBy])

  function exportCsv() {
    if (!sortedChanges?.length) return
    const headers = [
      'Ref',
      t({ tr: 'Başlık', en: 'Title' }),
      t({ tr: 'Tip', en: 'Type' }),
      t({ tr: 'Risk Skoru', en: 'Risk Score' }),
      t({ tr: 'Durum', en: 'Status' }),
      t({ tr: 'Planlanan', en: 'Scheduled' }),
    ]
    const rows = sortedChanges.map((c) => [
      c.ref,
      c.title,
      (TYPE_LABEL[c.change_type] ? pickLang(TYPE_LABEL[c.change_type], lang) : undefined) ?? c.change_type,
      c.risk_score,
      (STATUS_LABEL[c.status] ? pickLang(STATUS_LABEL[c.status], lang) : undefined) ?? c.status,
      c.scheduled_start ? new Date(c.scheduled_start).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US') : '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'degisiklikler.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {t({ tr: 'Değişiklik Yönetimi', en: 'Change Management' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Risk skoru, çift katmanlı onay ve PIR takibi', en: 'Risk scoring, dual-tier approval, and PIR tracking' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowFreezeModal(true)}>
            <Snowflake className="w-[15px] h-[15px]" />
            {t({ tr: 'Dondurma Pencereleri', en: 'Freeze Windows' })}
          </Button>
          <Button variant="ghost" onClick={() => setShowTemplatesModal(true)}>
            🚀 {t({ tr: 'Şablonlar', en: 'Templates' })}
          </Button>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="w-[15px] h-[15px]" />
            {t({ tr: 'Yeni Değişiklik', en: 'New Change' })}
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] mb-4">
        <button
          onClick={() => setPageTab('changes')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${pageTab === 'changes' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Değişiklikler', en: 'Changes' })}
        </button>
        <button
          onClick={() => setPageTab('calendar')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${pageTab === 'calendar' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Takvim', en: 'Calendar' })}
        </button>
        <button
          onClick={() => setPageTab('analytics')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${pageTab === 'analytics' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Analitik', en: 'Analytics' })}
        </button>
      </div>

      {pageTab === 'analytics' ? (
        <ChangeAnalytics />
      ) : pageTab === 'calendar' ? (
        <ChangeCalendarTab onOpenChange={(id) => setSelectedId(id)} />
      ) : (
      <>
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
            {pickLang(v.label, lang)}
          </button>
        ))}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="ml-auto text-[11.5px] font-semibold bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-1.5"
        >
          <option value="created_desc">{t({ tr: 'Sırala: Son Oluşturulan', en: 'Sort: Newest First' })}</option>
          <option value="risk">{t({ tr: 'Sırala: Risk Skoru', en: 'Sort: Risk Score' })}</option>
          <option value="az">{t({ tr: 'Sırala: A-Z', en: 'Sort: A-Z' })}</option>
        </select>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-sub)] hover:border-brand hover:text-brand-dim"
        >
          <Download className="w-[13px] h-[13px]" />
          {t({ tr: 'Dışa Aktar', en: 'Export' })}
        </button>
      </div>

      <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-x-auto bg-[var(--panel)]">
        <table className="w-full text-[12.5px] min-w-[720px]">
          <thead>
            <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
              <Th>{t({ tr: 'Ref', en: 'Ref' })}</Th>
              <Th>{t({ tr: 'Başlık', en: 'Title' })}</Th>
              <Th>{t({ tr: 'Tip', en: 'Type' })}</Th>
              <Th>{t({ tr: 'AI Risk Skoru', en: 'AI Risk Score' })}</Th>
              <Th>{t({ tr: 'Durum', en: 'Status' })}</Th>
              <Th>{t({ tr: 'Planlanan', en: 'Scheduled' })}</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[var(--text-faint)]">
                  {t({ tr: 'Yükleniyor…', en: 'Loading…' })}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-p1">
                  {t({ tr: 'Bir hata oluştu.', en: 'Something went wrong.' })}
                </td>
              </tr>
            )}
            {!isLoading && !error && changes?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-14 text-[var(--text-faint)]">
                  {t({ tr: 'Bu görünümde kayıt yok.', en: 'Nothing in this view.' })}
                </td>
              </tr>
            )}
            {sortedChanges?.map((c) => (
              <tr
                key={c.id}
                tabIndex={0}
                onClick={() => setSelectedId(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSelectedId(c.id)
                }}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--row-hover)] cursor-pointer"
              >
                <td className="px-3.5 py-3 font-mono text-[var(--text-faint)]">{c.ref}</td>
                <td className="px-3.5 py-3 font-semibold">{c.title}</td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{(TYPE_LABEL[c.change_type] ? pickLang(TYPE_LABEL[c.change_type], lang) : undefined)}</td>
                <td className="px-3.5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${riskColor(c.risk_score)}`}>
                    {c.risk_score}
                  </span>
                </td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{(STATUS_LABEL[c.status] ? pickLang(STATUS_LABEL[c.status], lang) : undefined) ?? c.status}</td>
                <td className="px-3.5 py-3 text-[var(--text-faint)]">
                  {c.scheduled_start ? new Date(c.scheduled_start).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

      {selectedId && <ChangeDrawer key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} />}
      {showNewModal && <NewChangeModal onClose={() => setShowNewModal(false)} />}
      {showFreezeModal && <FreezeWindowsModal canManage={!!canManage} onClose={() => setShowFreezeModal(false)} />}
      {showTemplatesModal && <ChangeTemplatesModal canManage={!!canManage} onClose={() => setShowTemplatesModal(false)} />}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">
      {children}
    </th>
  )
}
