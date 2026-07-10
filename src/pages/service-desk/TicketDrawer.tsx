import { useState, useEffect } from 'react'
import { Send, Star, Eye, Zap, BookmarkPlus, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { PriorityBadge, StatusBadge, STATUS_LABEL } from '@/components/ui/Badge'
import { priorityLabel } from '@/lib/priority'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  useIncidentDetail,
  useIncidentComments,
  useIncidentTimeline,
  useUpdateIncident,
  useAddComment,
  useDuplicateCandidates,
  useMergeIncident,
  useToggleMajorIncident,
  type IncidentTimelineEvent,
} from './useIncidents'
import { WarRoomPanel } from './WarRoomPanel'
import { LinkedIncidentsSection } from './LinkedIncidentsSection'
import {
  useTicketPresence,
  useCannedResponses,
  useCreateCannedResponse,
  useDeleteCannedResponse,
} from './useServiceDeskExtras'
import { useSummarizeTicket, useDraftReply } from './useAiAssist'
import type { TicketStatus, Priority } from '@/types/database'

const STATUS_OPTIONS: TicketStatus[] = ['new', 'open', 'in_progress', 'on_hold', 'resolved', 'closed']

export function TicketDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { lang, t } = useLang()
  const { profile } = useAuth()

  // Faz AY — İlişkili Kayıtlar'dan başka bir kayda tıklanınca drawer
  // içeriği kapanmadan o kayda geçer (parent'ın selectedId'sini bilmeden).
  const [currentId, setCurrentId] = useState(id)
  useEffect(() => setCurrentId(id), [id])

  const { data: incident, isLoading } = useIncidentDetail(currentId)
  const { data: comments } = useIncidentComments(currentId)
  const { data: timeline } = useIncidentTimeline(currentId)
  const updateIncident = useUpdateIncident(currentId)
  const addComment = useAddComment(currentId)
  const { data: duplicates } = useDuplicateCandidates(currentId, incident?.category ?? null)
  const mergeIncident = useMergeIncident()
  const toggleMajorIncident = useToggleMajorIncident(currentId)

  const [draft, setDraft] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [showCanned, setShowCanned] = useState(false)

  // Cila Faz AR — ajan çarpışma göstergesi + hazır yanıtlar
  const viewers = useTicketPresence(currentId)
  const { data: cannedResponses } = useCannedResponses()
  const createCanned = useCreateCannedResponse()
  const deleteCanned = useDeleteCannedResponse()

  // Faz AT — AI destekli özet ve yanıt taslağı
  const summarizeTicket = useSummarizeTicket()
  const draftReply = useDraftReply()
  const [aiSummary, setAiSummary] = useState<string | null>(null)

  function threadForAi() {
    return (comments ?? []).map((c) => ({
      author: c.author?.full_name ?? '—',
      body: c.body,
      isInternal: c.is_internal,
    }))
  }

  async function handleSummarize() {
    if (!incident) return
    setAiSummary(null)
    try {
      const result = await summarizeTicket.mutateAsync({
        title: incident.title,
        description: incident.description ?? '',
        comments: threadForAi(),
      })
      setAiSummary(result.summary)
    } catch {
      // sessizce yut — buton yeniden denenebilir
    }
  }

  async function handleAiDraft() {
    if (!incident) return
    try {
      const result = await draftReply.mutateAsync({
        title: incident.title,
        description: incident.description ?? '',
        comments: threadForAi(),
      })
      setDraft(result.draft)
    } catch {
      // sessizce yut
    }
  }

  function saveDraftAsTemplate() {
    const title = window.prompt(t({ tr: 'Şablon adı:', en: 'Template name:' }))
    if (!title?.trim() || !draft.trim()) return
    createCanned.mutate({ title: title.trim(), body: draft.trim() })
  }

  function submitComment() {
    if (!draft.trim()) return
    addComment.mutate({ body: draft.trim(), isInternal })
    setDraft('')
  }

  const canManage = profile && ['tenant_admin', 'manager', 'agent'].includes(profile.role)

  return (
    <Drawer
      open
      onClose={onClose}
      title={incident?.title ?? '…'}
      subtitle={
        incident && (
          <span className="font-mono">
            {incident.ref} · {new Date(incident.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
          </span>
        )
      }
      widthClass="w-[480px]"
    >
      {isLoading || !incident ? (
        <div className="text-[var(--text-faint)] text-sm py-10 text-center">
          {t({ tr: 'Yükleniyor…', en: 'Loading…' })}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <PriorityBadge priority={incident.priority} lang={lang} />
            <StatusBadge status={incident.status} lang={lang} />
            {incident.category && (
              <span className="text-[11px] text-[var(--text-faint)] bg-[var(--panel-2)] border border-[var(--border)] rounded-full px-2.5 py-0.5">
                {incident.category}
              </span>
            )}
            {viewers.length > 0 && (
              <span
                title={viewers.map((v) => v.fullName).join(', ')}
                className="flex items-center gap-1 text-[10.5px] font-bold text-p2 bg-p2-tint border border-p2/40 rounded-full px-2.5 py-0.5"
              >
                <Eye className="w-3 h-3" />
                {viewers.length === 1
                  ? t({ tr: `${viewers[0].fullName} da görüntülüyor`, en: `${viewers[0].fullName} is also viewing` })
                  : t({ tr: `${viewers.length} kişi daha görüntülüyor`, en: `${viewers.length} others viewing` })}
              </span>
            )}
            {canManage && incident.priority === 'P1' && (
              <button
                onClick={() => toggleMajorIncident.mutate(!incident.is_major_incident)}
                className={`ml-auto text-[10.5px] font-bold px-2.5 py-1 rounded-full ${incident.is_major_incident ? 'bg-p1 text-white' : 'bg-[var(--panel-2)] border border-p1/40 text-p1'}`}
              >
                {incident.is_major_incident
                  ? t({ tr: 'Büyük Olayı Kapat', en: 'End Major Incident' })
                  : t({ tr: 'Büyük Olay İlan Et', en: 'Declare Major Incident' })}
              </button>
            )}
          </div>

          {incident.is_major_incident && (
            <WarRoomPanel incidentId={currentId} declaredAt={incident.major_incident_declared_at} />
          )}

          {incident.description && (
            <p className="text-[13px] text-[var(--text-sub)] leading-relaxed whitespace-pre-wrap">
              {incident.description}
            </p>
          )}

          {canManage && (
            <div>
              <button
                onClick={handleSummarize}
                disabled={summarizeTicket.isPending}
                className="flex items-center gap-1.5 text-[11.5px] font-bold text-brand-dim disabled:opacity-40"
              >
                {summarizeTicket.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {t({ tr: 'AI ile Özetle', en: 'Summarize with AI' })}
              </button>
              {aiSummary && (
                <div className="mt-2 flex items-start gap-2 bg-brand-tint border border-brand/30 rounded-lg px-3 py-2.5 text-[12px] text-[var(--text-sub)]">
                  <Sparkles className="w-3.5 h-3.5 text-brand-dim shrink-0 mt-0.5" />
                  <span>{aiSummary}</span>
                </div>
              )}
            </div>
          )}

          {['resolved', 'closed'].includes(incident.status) && incident.requester_id === profile?.id && (
            <CsatSurvey existingScore={incident.csat_score} onSubmit={(score) => updateIncident.mutate({ csat_score: score })} />
          )}

          {canManage && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                  {t({ tr: 'Durum', en: 'Status' })}
                </label>
                <select
                  value={incident.status}
                  onChange={(e) => updateIncident.mutate({ status: e.target.value as TicketStatus })}
                  className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                  {t({ tr: 'Bana Ata', en: 'Assign to Me' })}
                </label>
                <button
                  onClick={() => profile && updateIncident.mutate({ assignee_id: profile.id })}
                  className="w-full text-[12.5px] font-semibold px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] hover:border-brand"
                >
                  {incident.assignee?.full_name ?? t({ tr: 'Talebi Üstlen', en: 'Take Ticket' })}
                </button>
              </div>
            </div>
          )}

          {canManage && !!duplicates?.length && incident.status !== 'merged' && (
            <div className="bg-p2-tint border border-p2/40 rounded-lg p-3">
              <div className="text-[11px] font-bold text-p2 uppercase mb-2">
                ⚠️ {t({ tr: 'Olası Tekrarlar', en: 'Possible Duplicates' })}
              </div>
              <div className="space-y-1.5">
                {duplicates.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[11.5px]">
                    <span className="font-mono text-[var(--text-faint)] shrink-0">{d.ref}</span>
                    <span className="flex-1 truncate">{d.title}</span>
                    <button
                      onClick={() => mergeIncident.mutate({ incidentId: currentId, mergeIntoId: d.id })}
                      className="text-[10.5px] font-bold text-brand-dim shrink-0"
                    >
                      {t({ tr: 'Bununla Birleştir', en: 'Merge Into This' })}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <LinkedIncidentsSection incidentId={currentId} onOpen={(newId) => setCurrentId(newId)} />
          </div>

          <div>
            <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
              {t({ tr: 'Zaman Çizelgesi', en: 'Timeline' })}
            </div>
            <ul className="space-y-2 mb-4">
              {timeline?.map((ev) => (
                <li key={ev.id} className="text-[11.5px] text-[var(--text-faint)] flex justify-between gap-2">
                  <span className="min-w-0">
                    {ev.actor?.full_name ? `${ev.actor.full_name} — ` : ''}
                    {formatTimelineEvent(ev, t)}
                  </span>
                  <span className="shrink-0">{new Date(ev.created_at).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>
                </li>
              ))}
              {!timeline?.length && (
                <li className="text-[11.5px] text-[var(--text-faint)] italic">
                  {t({ tr: 'Henüz olay yok', en: 'No events yet' })}
                </li>
              )}
            </ul>
          </div>

          <div>
            <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
              {t({ tr: 'Yorumlar', en: 'Comments' })}
            </div>
            <div className="space-y-3 mb-3">
              {comments?.map((c) => (
                <div
                  key={c.id}
                  className={
                    'rounded-xl p-3 text-[12.5px] ' +
                    (c.is_internal
                      ? 'bg-p2-tint border border-p2/40'
                      : 'bg-[var(--panel-2)] border border-[var(--border)]')
                  }
                >
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">{c.author?.full_name ?? '—'}</span>
                    <span className="text-[var(--text-faint)] text-[11px]">
                      {new Date(c.created_at).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                    </span>
                  </div>
                  <p className="text-[var(--text-sub)] whitespace-pre-wrap">{c.body}</p>
                  {c.is_internal && (
                    <span className="text-[9.5px] font-bold text-p2 uppercase mt-1 inline-block">
                      {t({ tr: 'Dahili Not', en: 'Internal Note' })}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {canManage && (
              <div className="relative mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCanned((s) => !s)}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] text-[var(--text-sub)] hover:border-brand hover:text-brand-dim"
                  >
                    <Zap className="w-3 h-3" />
                    {t({ tr: 'Hazır Yanıt', en: 'Canned Response' })}
                  </button>
                  <button
                    onClick={handleAiDraft}
                    disabled={draftReply.isPending}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-brand/30 bg-brand-tint text-brand-dim disabled:opacity-40"
                  >
                    {draftReply.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {t({ tr: 'AI Taslağı', en: 'AI Draft' })}
                  </button>
                  {draft.trim() && (
                    <button
                      onClick={saveDraftAsTemplate}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-faint)] hover:border-brand hover:text-brand-dim"
                    >
                      <BookmarkPlus className="w-3 h-3" />
                      {t({ tr: 'Şablon Olarak Kaydet', en: 'Save as Template' })}
                    </button>
                  )}
                </div>
                {showCanned && (
                  <div className="absolute z-20 bottom-full mb-1.5 left-0 w-full max-h-56 overflow-y-auto bg-[var(--panel)] border border-[var(--border)] rounded-xl shadow-lg p-1.5">
                    {!cannedResponses?.length && (
                      <div className="text-[11.5px] text-[var(--text-faint)] italic px-2.5 py-3">
                        {t({
                          tr: 'Henüz şablon yok. Bir yanıt yazıp "Şablon Olarak Kaydet" ile başlayın.',
                          en: 'No templates yet. Write a reply and use "Save as Template".',
                        })}
                      </div>
                    )}
                    {cannedResponses?.map((cr) => (
                      <div
                        key={cr.id}
                        className="group flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--row-hover)] cursor-pointer"
                        onClick={() => {
                          setDraft((d) => (d.trim() === '' || d.trim() === '/' ? cr.body : `${d}\n${cr.body}`))
                          setShowCanned(false)
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[11.5px] font-bold truncate">{cr.title}</div>
                          <div className="text-[11px] text-[var(--text-faint)] truncate">{cr.body}</div>
                        </div>
                        {(cr.created_by === profile?.id || ['tenant_admin', 'manager'].includes(profile?.role ?? '')) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteCanned.mutate(cr.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[var(--text-faint)] hover:text-p1 shrink-0 mt-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-start gap-2">
              <textarea
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  if (e.target.value === '/') setShowCanned(true)
                }}
                placeholder={t({ tr: 'Yanıt yazın… ("/" ile hazır yanıt)', en: 'Write a reply… ("/" for canned responses)' })}
                rows={2}
                className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12.5px] outline-none focus:border-brand resize-none"
              />
              <button
                onClick={submitComment}
                disabled={addComment.isPending}
                className="w-10 h-10 rounded-lg bg-brand text-white flex items-center justify-center shrink-0 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {canManage && (
              <label className="flex items-center gap-1.5 mt-2 text-[11px] text-[var(--text-faint)]">
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                {t({ tr: 'Dahili not (talep eden göremez)', en: "Internal note (requester can't see)" })}
              </label>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}

function CsatSurvey({ existingScore, onSubmit }: { existingScore: number | null; onSubmit: (score: number) => void }) {
  const { t } = useLang()
  const [hovered, setHovered] = useState<number | null>(null)

  if (existingScore) {
    return (
      <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3.5 text-center">
        <div className="text-[11.5px] text-[var(--text-faint)] mb-1.5">{t({ tr: 'Değerlendirmeniz', en: 'Your rating' })}</div>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`w-5 h-5 ${n <= existingScore ? 'fill-p2 text-p2' : 'text-[var(--border)]'}`} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-purple-tint/40 border border-purple/40 rounded-xl p-4 text-center">
      <div className="text-[13px] font-bold mb-2.5">{t({ tr: 'Bu çözümden ne kadar memnun kaldınız?', en: 'How satisfied are you with this resolution?' })}</div>
      <div className="flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSubmit(n)}
          >
            <Star className={`w-7 h-7 transition-colors ${(hovered ?? 0) >= n ? 'fill-p2 text-p2' : 'text-[var(--border)]'}`} />
          </button>
        ))}
      </div>
    </div>
  )
}

function formatTimelineEvent(ev: IncidentTimelineEvent, t: (d: { tr: string; en: string }) => string): string {
  const data = ev.event_data as Record<string, string | null> | null

  switch (ev.event_type) {
    case 'status_changed':
      return t({
        tr: `Durum değiştirildi: ${data?.from ? STATUS_LABEL[data.from as TicketStatus]?.tr ?? data.from : '—'} → ${data?.to ? STATUS_LABEL[data.to as TicketStatus]?.tr ?? data.to : '—'}`,
        en: `Status changed: ${data?.from ? STATUS_LABEL[data.from as TicketStatus]?.en ?? data.from : '—'} → ${data?.to ? STATUS_LABEL[data.to as TicketStatus]?.en ?? data.to : '—'}`,
      })
    case 'priority_changed':
      return t({
        tr: `Öncelik değiştirildi: ${data?.from ? priorityLabel(data.from as Priority, 'tr') : '—'} → ${data?.to ? priorityLabel(data.to as Priority, 'tr') : '—'}`,
        en: `Priority changed: ${data?.from ? priorityLabel(data.from as Priority, 'en') : '—'} → ${data?.to ? priorityLabel(data.to as Priority, 'en') : '—'}`,
      })
    case 'assignee_changed':
      return t({
        tr: data?.to ? 'Sahip değiştirildi' : 'Sahiplik kaldırıldı',
        en: data?.to ? 'Assignee changed' : 'Assignee removed',
      })
    case 'category_changed':
      return t({ tr: `Kategori değiştirildi: ${data?.to ?? '—'}`, en: `Category changed: ${data?.to ?? '—'}` })
    case 'bulk_update':
      return t({ tr: `Toplu işlem: ${data?.summary ?? ''}`, en: `Bulk update: ${data?.summary ?? ''}` })
    default:
      return ev.event_type
  }
}
