import { useState } from 'react'
import { GitBranch, Plus } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { PriorityBadge } from '@/components/ui/Badge'
import { useLang } from '@/contexts/LangContext'
import { useProblemDetail, useLinkedIncidents, useProblemTimeline, useUpdateProblem } from './useProblems'
import { useLinkedChanges } from '@/pages/changes/useChanges'
import { NewChangeModal } from '@/pages/changes/NewChangeModal'
import { FishboneDiagram } from './FishboneDiagram'
import type { ProblemStatus } from '@/types/database'

const STATUS_OPTIONS: ProblemStatus[] = [
  'investigating',
  'root_cause_identified',
  'known_error',
  'monitoring',
  'resolved',
  'closed',
]

export function ProblemDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { lang, t } = useLang()
  const { data: problem, isLoading } = useProblemDetail(id)
  const { data: linkedIncidents } = useLinkedIncidents(id)
  const { data: timeline } = useProblemTimeline(id)
  const { data: linkedChanges } = useLinkedChanges(id)
  const updateProblem = useUpdateProblem(id)
  const [showNewChangeModal, setShowNewChangeModal] = useState(false)

  const [workaround, setWorkaround] = useState('')

  return (
    <Drawer
      open
      onClose={onClose}
      title={problem?.title ?? '…'}
      subtitle={problem && <span className="font-mono">{problem.ref}</span>}
      widthClass="w-[640px]"
    >
      {isLoading || !problem ? (
        <div className="text-[var(--text-faint)] text-sm py-10 text-center">
          {t({ tr: 'Yükleniyor…', en: 'Loading…' })}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <PriorityBadge priority={problem.priority} lang={lang} />
            {problem.is_known_error && (
              <span className="text-[10px] font-bold uppercase bg-purple-tint text-purple rounded-full px-2 py-0.5">
                {t({ tr: 'Bilinen Hata', en: 'Known Error' })}
              </span>
            )}
          </div>

          {problem.description && (
            <p className="text-[13px] text-[var(--text-sub)] leading-relaxed whitespace-pre-wrap">
              {problem.description}
            </p>
          )}

          <div>
            <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Durum', en: 'Status' })}
            </label>
            <select
              value={problem.status}
              onChange={(e) => updateProblem.mutate({ status: e.target.value as ProblemStatus })}
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
            <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2">
              {t({ tr: 'Kök Neden Analizi (Fishbone)', en: 'Root Cause Analysis (Fishbone)' })}
            </label>
            {problem.root_cause && (
              <p className="text-[12.5px] text-[var(--text-sub)] bg-brand-tint border border-brand/40 rounded-lg p-3 mb-3">
                ✓ <b>{t({ tr: 'Onaylanan Kök Neden:', en: 'Confirmed Root Cause:' })}</b> {problem.root_cause}
              </p>
            )}
            <FishboneDiagram problemId={problem.id} problemTitle={problem.title} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-[var(--panel-2)] border border-[var(--border)] px-3 py-2.5">
            <span className="text-[12px] font-semibold">
              {t({ tr: 'Bilinen Hata olarak işaretle', en: 'Mark as Known Error' })}
            </span>
            <input
              type="checkbox"
              checked={problem.is_known_error}
              onChange={(e) => updateProblem.mutate({ is_known_error: e.target.checked })}
            />
          </div>

          {problem.is_known_error && (
            <div>
              <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                {t({ tr: 'Geçici Çözüm (Workaround)', en: 'Workaround' })}
              </label>
              {problem.known_error_workaround ? (
                <p className="text-[12.5px] text-[var(--text-sub)] bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3">
                  {problem.known_error_workaround}
                </p>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={workaround}
                    onChange={(e) => setWorkaround(e.target.value)}
                    placeholder={t({ tr: 'Kalıcı çözüme kadar geçici önlem…', en: 'Temporary mitigation…' })}
                    className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12.5px]"
                  />
                  <button
                    onClick={() => workaround.trim() && updateProblem.mutate({ known_error_workaround: workaround.trim() })}
                    className="text-[12px] font-bold px-3 rounded-lg bg-brand text-white shrink-0"
                  >
                    {t({ tr: 'Kaydet', en: 'Save' })}
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                {t({ tr: 'Kalıcı Çözüm — Bağlı Değişiklikler', en: 'Permanent Fix — Linked Changes' })} ({linkedChanges?.length ?? 0})
              </div>
              <button onClick={() => setShowNewChangeModal(true)} className="flex items-center gap-1 text-[11px] font-bold text-brand-dim">
                <Plus className="w-3.5 h-3.5" />
                {t({ tr: 'Değişiklik Oluştur', en: 'Create Change' })}
              </button>
            </div>
            <ul className="space-y-1.5">
              {linkedChanges?.map((c) => (
                <li key={c.id} className="text-[12px] flex justify-between bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2">
                  <span className="font-mono text-[var(--text-faint)]">{c.ref}</span>
                  <span className="truncate flex-1 ml-2">{c.title}</span>
                  <span className="text-[10.5px] text-[var(--text-faint)] shrink-0 ml-2">{c.status}</span>
                </li>
              ))}
              {!linkedChanges?.length && (
                <li className="text-[11.5px] text-[var(--text-faint)] italic">
                  {t({
                    tr: 'Bu problem için henüz kalıcı çözüm değişikliği oluşturulmadı.',
                    en: 'No permanent-fix change created for this problem yet.',
                  })}
                </li>
              )}
            </ul>
          </div>

          <div>
            <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
              {t({ tr: 'Bağlı Olaylar', en: 'Linked Incidents' })} ({linkedIncidents?.length ?? 0})
            </div>
            <ul className="space-y-1.5">
              {linkedIncidents?.map((li) => (
                <li
                  key={li.incident_id}
                  className="text-[12px] flex justify-between bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2"
                >
                  <span className="font-mono text-[var(--text-faint)]">{li.incident?.ref}</span>
                  <span className="truncate flex-1 ml-2">{li.incident?.title}</span>
                </li>
              ))}
              {!linkedIncidents?.length && (
                <li className="text-[11.5px] text-[var(--text-faint)] italic">
                  {t({ tr: 'Henüz bağlı olay yok', en: 'No linked incidents yet' })}
                </li>
              )}
            </ul>
          </div>

          <div>
            <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
              {t({ tr: 'Zaman Çizelgesi', en: 'Timeline' })}
            </div>
            <ul className="space-y-2">
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
        </div>
      )}
      {showNewChangeModal && problem && (
        <NewChangeModal
          onClose={() => setShowNewChangeModal(false)}
          prefill={{
            title: t({ tr: `Kalıcı Çözüm: ${problem.title}`, en: `Permanent Fix: ${problem.title}` }),
            description: problem.root_cause
              ? t({ tr: `Kök neden: ${problem.root_cause}\n\n${problem.description ?? ''}`, en: `Root cause: ${problem.root_cause}\n\n${problem.description ?? ''}` })
              : (problem.description ?? ''),
            category: problem.category ?? '',
            problemId: problem.id,
          }}
        />
      )}
    </Drawer>
  )
}
