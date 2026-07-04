import { useState } from 'react'
import { Send } from 'lucide-react'
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
} from './useIncidents'
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
          </div>

          {incident.description && (
            <p className="text-[13px] text-[var(--text-sub)] leading-relaxed whitespace-pre-wrap">
              {incident.description}
            </p>
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
