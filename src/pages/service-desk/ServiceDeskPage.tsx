import { useState, useEffect } from 'react'
import { useOpenParam } from '@/hooks/useOpenParam'
import { Plus, Download, List, Kanban, BookmarkPlus, X } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { useIncidents, useUpdateIncident, useMajorIncidents, type SavedView } from './useIncidents'
import { TicketDrawer } from './TicketDrawer'
import { NewTicketModal } from './NewTicketModal'
import { ServiceDeskAnalytics } from './ServiceDeskAnalytics'
import {
  useSavedFilters,
  useSaveFilter,
  useDeleteSavedFilter,
  computeSlaMeter,
  type SavedFilterState,
} from './useServiceDeskExtras'
import type { TicketStatus, TicketChannel } from '@/types/database'

const CHANNEL_LABEL: Record<TicketChannel, { tr: string; en: string }> = {
  portal: { tr: 'Portal', en: 'Portal' },
  email: { tr: 'E-posta', en: 'Email' },
  chat: { tr: 'Sohbet', en: 'Chat' },
  phone: { tr: 'Telefon', en: 'Phone' },
  teams: { tr: 'Teams', en: 'Teams' },
}

const SAVED_VIEWS: { key: SavedView; label: { tr: string; en: string } }[] = [
  { key: 'all', label: { tr: 'Tümü', en: 'All' } },
  { key: 'open', label: { tr: 'Açık', en: 'Open' } },
  { key: 'mine', label: { tr: 'Bana Atananlar', en: 'Assigned to Me' } },
  { key: 'unassigned', label: { tr: 'Atanmamış', en: 'Unassigned' } },
]

const KANBAN_COLUMNS: { key: TicketStatus; label: { tr: string; en: string } }[] = [
  { key: 'new', label: { tr: 'Yeni', en: 'New' } },
  { key: 'open', label: { tr: 'Açık', en: 'Open' } },
  { key: 'in_progress', label: { tr: 'İşlemde', en: 'In Progress' } },
  { key: 'on_hold', label: { tr: 'Beklemede', en: 'On Hold' } },
  { key: 'resolved', label: { tr: 'Çözüldü', en: 'Resolved' } },
]

function nextStatus(current: TicketStatus): TicketStatus {
  const order: TicketStatus[] = ['new', 'open', 'in_progress', 'on_hold', 'resolved']
  const idx = order.indexOf(current)
  return order[(idx + 1) % order.length]
}

export function ServiceDeskPage() {
  const { lang, t } = useLang()
  const [view, setView] = useState<SavedView>('open')
  const [channel, setChannel] = useState<TicketChannel | 'all'>('all')
  const [pageTab, setPageTab] = useState<'tickets' | 'analytics'>('tickets')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const openId = useOpenParam()
  useEffect(() => { if (openId) setSelectedId(openId) }, [openId])
  const [showNewModal, setShowNewModal] = useState(false)

  const { data: incidentsRaw, isLoading, error } = useIncidents(view, channel)
  const { data: allIncidents } = useIncidents('all')
  const { data: majorIncidents } = useMajorIncidents()
  const [sortBy, setSortBy] = useState<'created_desc' | 'priority' | 'sla' | 'az'>('created_desc')

  // Cila Faz AR — kullanıcı tanımlı kaydedilmiş görünümler
  const { data: savedFilters } = useSavedFilters()
  const saveFilter = useSaveFilter()
  const deleteSavedFilter = useDeleteSavedFilter()
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null)

  function applySavedFilter(id: string, f: SavedFilterState) {
    setView(f.view)
    setChannel(f.channel)
    setSortBy(f.sortBy)
    setActiveSavedId(id)
  }

  function saveCurrentView() {
    const name = window.prompt(t({ tr: 'Görünüm adı:', en: 'View name:' }))
    if (!name?.trim()) return
    saveFilter.mutate({ name: name.trim(), filters: { view, channel, sortBy } })
  }

  const incidents = incidentsRaw ? [...incidentsRaw].sort((a, b) => {
    if (sortBy === 'priority') return a.priority.localeCompare(b.priority)
    if (sortBy === 'sla') {
      if (!a.sla_due_at) return 1
      if (!b.sla_due_at) return -1
      return new Date(a.sla_due_at).getTime() - new Date(b.sla_due_at).getTime()
    }
    if (sortBy === 'az') return a.title.localeCompare(b.title)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }) : incidentsRaw

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

      {!!majorIncidents?.length && (
        <div className="space-y-2 mb-5">
          {majorIncidents.map((mi) => (
            <button
              key={mi.id}
              onClick={() => setSelectedId(mi.id)}
              className="w-full flex items-center gap-3 bg-p1-tint border-2 border-p1 rounded-xl px-4 py-3 text-left hover:opacity-90"
            >
              <span className="w-2 h-2 rounded-full bg-p1 animate-pulse shrink-0" />
              <span className="text-[10.5px] font-bold text-p1 uppercase shrink-0">
                {t({ tr: 'Büyük Olay', en: 'Major Incident' })}
              </span>
              <span className="flex-1 font-semibold text-[13px] truncate">{mi.title}</span>
              <span className="font-mono text-[11px] text-[var(--text-faint)] shrink-0">{mi.ref}</span>
            </button>
          ))}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <Kpi label={t({ tr: 'Açık Kayıt', en: 'Open Tickets' })} value={kpis.open} />
        <Kpi label="P1" value={kpis.p1} accent="p1" />
        <Kpi label={t({ tr: 'Atanmamış', en: 'Unassigned' })} value={kpis.unassigned} accent="p2" />
        <Kpi label={t({ tr: 'Toplam', en: 'Total' })} value={kpis.total} />
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] mb-4">
        <button
          onClick={() => setPageTab('tickets')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${pageTab === 'tickets' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Talepler', en: 'Tickets' })}
        </button>
        <button
          onClick={() => setPageTab('analytics')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${pageTab === 'analytics' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Analitik', en: 'Analytics' })}
        </button>
      </div>

      {pageTab === 'analytics' ? (
        <ServiceDeskAnalytics />
      ) : (
      <>
      {/* Saved views + export */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {SAVED_VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => {
              setView(v.key)
              setActiveSavedId(null)
            }}
            className={
              'text-[12.5px] font-bold px-3.5 py-2 rounded-lg border transition-colors ' +
              (view === v.key && !activeSavedId
                ? 'bg-brand border-brand text-white'
                : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]')
            }
          >
            {v.label[lang]}
          </button>
        ))}
        {savedFilters?.map((sf) => (
          <span
            key={sf.id}
            className={
              'group flex items-center gap-1.5 text-[12.5px] font-bold pl-3.5 pr-2 py-2 rounded-lg border cursor-pointer transition-colors ' +
              (activeSavedId === sf.id
                ? 'bg-brand border-brand text-white'
                : 'bg-[var(--panel)] border-dashed border-[var(--border)] text-[var(--text-sub)]')
            }
            onClick={() => applySavedFilter(sf.id, sf.filters)}
          >
            {sf.name}
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteSavedFilter.mutate(sf.id)
                if (activeSavedId === sf.id) setActiveSavedId(null)
              }}
              className={`opacity-0 group-hover:opacity-100 ${activeSavedId === sf.id ? 'text-white/80' : 'text-[var(--text-faint)]'} hover:text-p1`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          onClick={saveCurrentView}
          title={t({ tr: 'Geçerli filtre + kanal + sıralamayı görünüm olarak kaydet', en: 'Save current filter + channel + sort as a view' })}
          className="flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-2 rounded-lg border border-[var(--border)] text-[var(--text-faint)] hover:border-brand hover:text-brand-dim"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          {t({ tr: 'Görünümü Kaydet', en: 'Save View' })}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-2 ${viewMode === 'list' ? 'bg-brand text-white' : 'bg-[var(--panel)] text-[var(--text-faint)]'}`}
            >
              <List className="w-[14px] h-[14px]" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-2 ${viewMode === 'kanban' ? 'bg-brand text-white' : 'bg-[var(--panel)] text-[var(--text-faint)]'}`}
            >
              <Kanban className="w-[14px] h-[14px]" />
            </button>
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-sub)] hover:border-brand hover:text-brand-dim"
          >
            <Download className="w-[13px] h-[13px]" />
            {t({ tr: 'Dışa Aktar', en: 'Export' })}
          </button>
        </div>
      </div>

      {/* Omnichannel filtresi + Sırala */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <span className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase mr-1">{t({ tr: 'Kanal:', en: 'Channel:' })}</span>
        <button
          onClick={() => setChannel('all')}
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${channel === 'all' ? 'bg-brand border-brand text-white' : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]'}`}
        >
          {t({ tr: 'Tümü', en: 'All' })}
        </button>
        {(Object.keys(CHANNEL_LABEL) as TicketChannel[]).map((c) => (
          <button
            key={c}
            onClick={() => setChannel(c)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${channel === c ? 'bg-brand border-brand text-white' : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]'}`}
          >
            {CHANNEL_LABEL[c][lang]}
          </button>
        ))}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="ml-auto text-[11.5px] font-semibold bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-1.5"
        >
          <option value="created_desc">{t({ tr: 'Sırala: Son Oluşturulan', en: 'Sort: Newest First' })}</option>
          <option value="priority">{t({ tr: 'Sırala: Öncelik', en: 'Sort: Priority' })}</option>
          <option value="sla">{t({ tr: 'Sırala: SLA Süresi', en: 'Sort: SLA Due Date' })}</option>
          <option value="az">{t({ tr: 'Sırala: A-Z', en: 'Sort: A-Z' })}</option>
        </select>
      </div>

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-5 gap-2.5">
          {KANBAN_COLUMNS.map((col) => (
            <div key={col.key}>
              <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase mb-2 flex items-center justify-between">
                <span>{col.label[lang]}</span>
                <span>{incidents?.filter((i) => i.status === col.key).length ?? 0}</span>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {incidents
                  ?.filter((i) => i.status === col.key)
                  .map((i) => (
                    <KanbanCard key={i.id} incident={i} onOpen={() => setSelectedId(i.id)} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
      <>
      {/* Table */}
      <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-hidden bg-[var(--panel)]">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
              <Th>{t({ tr: 'Ref', en: 'Ref' })}</Th>
              <Th>{t({ tr: 'Başlık', en: 'Title' })}</Th>
              <Th>{t({ tr: 'Öncelik', en: 'Priority' })}</Th>
              <Th>{t({ tr: 'Durum', en: 'Status' })}</Th>
              <Th>SLA</Th>
              <Th>{t({ tr: 'Talep Eden', en: 'Requester' })}</Th>
              <Th>{t({ tr: 'Atanan', en: 'Assignee' })}</Th>
              <Th>{t({ tr: 'Oluşturma', en: 'Created' })}</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-[var(--text-faint)]">
                  {t({ tr: 'Yükleniyor…', en: 'Loading…' })}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-p1">
                  {t({ tr: 'Bir hata oluştu. Supabase bağlantınızı kontrol edin.', en: 'Something went wrong. Check your Supabase connection.' })}
                </td>
              </tr>
            )}
            {!isLoading && !error && incidents?.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-14 text-[var(--text-faint)]">
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
                <td className="px-3.5 py-3">
                  <SlaMeter incident={i} />
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
      </>
      )}
      </>
      )}

      {selectedId && <TicketDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
      {showNewModal && <NewTicketModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}

function KanbanCard({
  incident,
  onOpen,
}: {
  incident: { id: string; ref: string; title: string; priority: import('@/types/database').Priority; status: TicketStatus; assignee: { full_name: string } | null }
  onOpen: () => void
}) {
  const updateIncident = useUpdateIncident(incident.id)
  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-3 hover:border-brand transition-colors">
      <div onClick={onOpen} className="cursor-pointer">
        <div className="flex items-center justify-between mb-1.5">
          <PriorityBadge priority={incident.priority} />
          <span className="font-mono text-[10px] text-[var(--text-faint)]">{incident.ref}</span>
        </div>
        <div className="text-[12px] font-semibold mb-1.5 line-clamp-2">{incident.title}</div>
        <div className="text-[10.5px] text-[var(--text-faint)]">{incident.assignee?.full_name ?? '—'}</div>
      </div>
      {incident.status !== 'resolved' && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            updateIncident.mutate({ status: nextStatus(incident.status) })
          }}
          className="w-full mt-2 text-[10.5px] font-bold py-1.5 rounded-md bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text-sub)] hover:border-brand"
        >
          →
        </button>
      )}
    </div>
  )
}

function SlaMeter({
  incident,
}: {
  incident: { sla_due_at: string | null; created_at: string; status: TicketStatus }
}) {
  const { t } = useLang()
  if (['resolved', 'closed', 'merged'].includes(incident.status)) {
    return <span className="text-[10.5px] text-[var(--text-faint)]">—</span>
  }
  if (!incident.sla_due_at) {
    return <span className="text-[10.5px] text-[var(--text-faint)] italic">{t({ tr: 'SLA yok', en: 'No SLA' })}</span>
  }
  const m = computeSlaMeter(incident.created_at, incident.sla_due_at)
  const color =
    m.level === 'breached' || m.level === 'danger' ? 'bg-p1' : m.level === 'warn' ? 'bg-p2' : 'bg-ok'
  const textColor =
    m.level === 'breached' ? 'text-p1 font-bold' : m.level === 'danger' ? 'text-p1' : m.level === 'warn' ? 'text-p2' : 'text-[var(--text-faint)]'
  return (
    <div className="w-[92px]">
      <div className="h-1.5 rounded-full bg-[var(--panel-2)] border border-[var(--border)] overflow-hidden mb-1">
        <div className={`h-full ${color}`} style={{ width: `${m.pct}%` }} />
      </div>
      <div className={`text-[10px] ${textColor}`}>
        {m.level === 'breached'
          ? t({ tr: `${m.remainingLabel} ihlal`, en: `${m.remainingLabel} overdue` })
          : t({ tr: `${m.remainingLabel} kaldı`, en: `${m.remainingLabel} left` })}
      </div>
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
