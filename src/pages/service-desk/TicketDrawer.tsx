import { useState } from 'react'
import { Send, Star } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
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
} from './useIncidents'
import { WarRoomPanel } from './WarRoomPanel'
import type { TicketStatus } from '@/types/database'

const STATUS_OPTIONS: TicketStatus[] = ['new', 'open', 'in_progress', 'on_hold', 'resolved', 'closed']

export function TicketDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const { data: incident, isLoading } = useIncidentDetail(id)
  const { data: comments } = useIncidentComments(id)
  const { data: timeline } = useIncidentTimeline(id)
  const updateIncident = useUpdateIncident(id)
  const addComment = useAddComment(id)
  const { data: duplicates } = useDuplicateCandidates(id, incident?.category ?? null)
  const mergeIncident = useMergeIncident()
  const toggleMajorIncident = useToggleMajorIncident(id)

  const [draft, setDraft] = useState('')
  const [isInternal, setIsInternal] = useState(false)

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
            <PriorityBadge priority={incident.priority} />
            <StatusBadge status={incident.status} lang={lang} />
            {incident.category && (
              <span className="text-[11px] text-[var(--text-faint)] bg-[var(--panel-2)] border border-[var(--border)] rounded-full px-2.5 py-0.5">
                {incident.category}
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
            <WarRoomPanel incidentId={id} declaredAt={incident.major_incident_declared_at} />
          )}

          {incident.description && (
            <p className="text-[13px] text-[var(--text-sub)] leading-relaxed whitespace-pre-wrap">
              {incident.description}
            </p>
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
                      onClick={() => mergeIncident.mutate({ incidentId: id, mergeIntoId: d.id })}
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
            <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
              {t({ tr: 'Zaman Çizelgesi', en: 'Timeline' })}
            </div>
            <ul className="space-y-2 mb-4">
              {timeline?.map((ev) => (
                <li key={ev.id} className="text-[11.5px] text-[var(--text-faint)] flex justify-between">
                  <span>
                    {ev.actor?.full_name ? `${ev.actor.full_name} — ` : ''}
                    {ev.event_type}
                  </span>
                  <span>{new Date(ev.created_at).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>
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

            <div className="flex items-start gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t({ tr: 'Yanıt yazın…', en: 'Write a reply…' })}
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
