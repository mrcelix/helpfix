import { useState } from 'react'
import { Plus, Download } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { useIncidents, type SavedView } from './useIncidents'
import { TicketDrawer } from './TicketDrawer'
import { NewTicketModal } from './NewTicketModal'

const SAVED_VIEWS: { key: SavedView; label: { tr: string; en: string } }[] = [
  { key: 'all', label: { tr: 'Tümü', en: 'All' } },
  { key: 'open', label: { tr: 'Açık', en: 'Open' } },
  { key: 'mine', label: { tr: 'Bana Atananlar', en: 'Assigned to Me' } },
  { key: 'unassigned', label: { tr: 'Atanmamış', en: 'Unassigned' } },
]

export function ServiceDeskPage() {
  const { lang, t } = useLang()
  const [view, setView] = useState<SavedView>('open')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)

  const { data: incidents, isLoading, error } = useIncidents(view)
  const { data: allIncidents } = useIncidents('all')

  const kpis = {
    total: allIncidents?.length ?? 0,
    p1: allIncidents?.filter((i) => i.priority === 'P1' && !['resolved', 'closed'].includes(i.status)).length ?? 0,
    unassigned: allIncidents?.filter((i) => !i.assignee).length ?? 0,
    open: allIncidents?.filter((i) => !['resolved', 'closed', 'merged'].includes(i.status)).length ?? 0,
  }

  function exportCsv() {
    if (!incidents?.length) return
    const header = ['Ref', 'Başlık', 'Öncelik', 'Durum', 'Talep Eden', 'Oluşturma']
    const rows = incidents.map((i) => [
      i.ref,
      i.title,
      i.priority,
      i.status,
      i.requester?.full_name ?? '',
      new Date(i.created_at).toLocaleString('tr-TR'),
    ])
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `servis-masasi-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {t({ tr: 'Servis Masası', en: 'Service Desk' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Olay ve talep yönetimi', en: 'Incident & request management' })}
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="w-[15px] h-[15px]" />
          {t({ tr: 'Yeni Talep', en: 'New Ticket' })}
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <Kpi label={t({ tr: 'Açık Kayıt', en: 'Open Tickets' })} value={kpis.open} />
        <Kpi label="P1" value={kpis.p1} accent="p1" />
        <Kpi label={t({ tr: 'Atanmamış', en: 'Unassigned' })} value={kpis.unassigned} accent="p2" />
        <Kpi label={t({ tr: 'Toplam', en: 'Total' })} value={kpis.total} />
      </div>

      {/* Saved views + export */}
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
        <button
          onClick={exportCsv}
          className="ml-auto flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-sub)] hover:border-brand hover:text-brand-dim"
        >
          <Download className="w-[13px] h-[13px]" />
          {t({ tr: 'Dışa Aktar', en: 'Export' })}
        </button>
      </div>

      {/* Table */}
      <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-hidden bg-[var(--panel)]">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
              <Th>{t({ tr: 'Ref', en: 'Ref' })}</Th>
              <Th>{t({ tr: 'Başlık', en: 'Title' })}</Th>
              <Th>{t({ tr: 'Öncelik', en: 'Priority' })}</Th>
              <Th>{t({ tr: 'Durum', en: 'Status' })}</Th>
              <Th>{t({ tr: 'Talep Eden', en: 'Requester' })}</Th>
              <Th>{t({ tr: 'Atanan', en: 'Assignee' })}</Th>
              <Th>{t({ tr: 'Oluşturma', en: 'Created' })}</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-[var(--text-faint)]">
                  {t({ tr: 'Yükleniyor…', en: 'Loading…' })}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-p1">
                  {t({ tr: 'Bir hata oluştu. Supabase bağlantınızı kontrol edin.', en: 'Something went wrong. Check your Supabase connection.' })}
                </td>
              </tr>
            )}
            {!isLoading && !error && incidents?.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-14 text-[var(--text-faint)]">
                  {t({ tr: 'Bu görünümde kayıt yok.', en: 'Nothing in this view.' })}
                </td>
              </tr>
            )}
            {incidents?.map((i) => (
              <tr
                key={i.id}
                onClick={() => setSelectedId(i.id)}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--row-hover)] cursor-pointer"
              >
                <td className="px-3.5 py-3 font-mono text-[var(--text-faint)]">{i.ref}</td>
                <td className="px-3.5 py-3 font-semibold">{i.title}</td>
                <td className="px-3.5 py-3">
                  <PriorityBadge priority={i.priority} />
                </td>
                <td className="px-3.5 py-3">
                  <StatusBadge status={i.status} lang={lang} />
                </td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{i.requester?.full_name ?? '—'}</td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">
                  {i.assignee?.full_name ?? (
                    <span className="text-[var(--text-faint)] italic">
                      {t({ tr: 'atanmadı', en: 'unassigned' })}
                    </span>
                  )}
                </td>
                <td className="px-3.5 py-3 text-[var(--text-faint)]">
                  {new Date(i.created_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId && <TicketDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
      {showNewModal && <NewTicketModal onClose={() => setShowNewModal(false)} />}
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

function Kpi({ label, value, accent }: { label: string; value: number; accent?: 'p1' | 'p2' }) {
  const color = accent === 'p1' ? 'text-p1' : accent === 'p2' ? 'text-p2' : 'text-[var(--text)]'
  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius-app)] p-3.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">{label}</div>
      <div className={`font-display text-[20px] font-bold mt-1 ${color}`}>{value}</div>
    </div>
  )
}
