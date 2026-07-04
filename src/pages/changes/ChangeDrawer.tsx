import { useState } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  useChangeDetail,
  useChangeApprovals,
  useChangeTimeline,
  useUpdateChange,
  useDecideApproval,
} from './useChanges'
import type { PirOutcome } from '@/types/database'

const APPROVAL_LABEL: Record<string, { tr: string; en: string }> = {
  technical_review: { tr: 'Teknik İnceleme', en: 'Technical Review' },
  cab: { tr: 'CAB (Değişiklik Kurulu)', en: 'CAB (Change Advisory Board)' },
}

function riskColor(score: number) {
  if (score >= 60) return 'text-p1 bg-p1-tint'
  if (score >= 31) return 'text-p2 bg-p2-tint'
  return 'text-ok bg-[#0F2E1F]'
}

export function ChangeDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const { data: change, isLoading } = useChangeDetail(id)
  const { data: approvals } = useChangeApprovals(id)
  const { data: timeline } = useChangeTimeline(id)
  const updateChange = useUpdateChange(id)
  const decideApproval = useDecideApproval(id)

  const [pirOutcome, setPirOutcome] = useState<PirOutcome>('successful')
  const [pirNotes, setPirNotes] = useState('')

  const canManage = profile && ['tenant_admin', 'manager', 'agent'].includes(profile.role)
  const isDraft = change?.status === 'draft'

  return (
    <Drawer
      open
      onClose={onClose}
      title={change?.title ?? '…'}
      subtitle={change && <span className="font-mono">{change.ref}</span>}
      widthClass="w-[480px]"
    >
      {isLoading || !change ? (
        <div className="text-[var(--text-faint)] text-sm py-10 text-center">
          {t({ tr: 'Yükleniyor…', en: 'Loading…' })}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${riskColor(change.risk_score)}`}>
              {t({ tr: 'Risk', en: 'Risk' })}: {change.risk_score}
            </span>
            <span className="text-[11px] text-[var(--text-faint)] bg-[var(--panel-2)] border border-[var(--border)] rounded-full px-2.5 py-0.5">
              {change.status}
            </span>
          </div>

          {change.description && (
            <p className="text-[13px] text-[var(--text-sub)] leading-relaxed whitespace-pre-wrap">
              {change.description}
            </p>
          )}

          {isDraft && canManage && (
            <button
              onClick={() => updateChange.mutate({ status: 'submitted' })}
              className="w-full py-2.5 rounded-lg bg-brand text-white text-[13px] font-bold"
            >
              {t({ tr: 'Onaya Gönder', en: 'Submit for Approval' })}
            </button>
          )}

          {!!approvals?.length && (
            <div>
              <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
                {t({ tr: 'Onay Zinciri', en: 'Approval Chain' })}
              </div>
              <div className="space-y-2">
                {approvals.map((a) => (
                  <div key={a.id} className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12.5px] font-bold">{APPROVAL_LABEL[a.approval_type][lang]}</span>
                      <span
                        className={
                          'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ' +
                          (a.status === 'approved'
                            ? 'bg-[#0F2E1F] text-ok'
                            : a.status === 'rejected'
                              ? 'bg-p1-tint text-p1'
                              : 'bg-p2-tint text-p2')
                        }
                      >
                        {a.status}
                      </span>
                    </div>
                    {a.status === 'pending' && canManage && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => decideApproval.mutate({ approvalId: a.id, decision: 'approved' })}
                          className="flex-1 text-[11.5px] font-bold py-1.5 rounded-md bg-ok text-white"
                        >
                          {t({ tr: 'Onayla', en: 'Approve' })}
                        </button>
                        <button
                          onClick={() => decideApproval.mutate({ approvalId: a.id, decision: 'rejected' })}
                          className="flex-1 text-[11.5px] font-bold py-1.5 rounded-md bg-[var(--panel)] border border-[var(--border)]"
                        >
                          {t({ tr: 'Reddet', en: 'Reject' })}
                        </button>
                      </div>
                    )}
                    {a.approver && (
                      <div className="text-[10.5px] text-[var(--text-faint)] mt-1.5">{a.approver.full_name}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {change.status === 'approved' && canManage && (
            <button
              onClick={() => updateChange.mutate({ status: 'scheduled' })}
              className="w-full py-2.5 rounded-lg bg-brand text-white text-[13px] font-bold"
            >
              {t({ tr: 'Planla', en: 'Schedule' })}
            </button>
          )}
          {change.status === 'scheduled' && canManage && (
            <button
              onClick={() => updateChange.mutate({ status: 'in_progress' })}
              className="w-full py-2.5 rounded-lg bg-brand text-white text-[13px] font-bold"
            >
              {t({ tr: 'Uygulamaya Başla', en: 'Start Implementation' })}
            </button>
          )}
          {change.status === 'in_progress' && canManage && (
            <button
              onClick={() => updateChange.mutate({ status: 'completed' })}
              className="w-full py-2.5 rounded-lg bg-brand text-white text-[13px] font-bold"
            >
              {t({ tr: 'Tamamlandı Olarak İşaretle', en: 'Mark Completed' })}
            </button>
          )}

          {change.status === 'completed' && !change.pir_outcome && canManage && (
            <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3.5">
              <div className="text-[12px] font-bold mb-2.5">
                {t({ tr: 'Post-Implementation Review (PIR)', en: 'Post-Implementation Review (PIR)' })}
              </div>
              <select
                value={pirOutcome}
                onChange={(e) => setPirOutcome(e.target.value as PirOutcome)}
                className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px] mb-2"
              >
                <option value="successful">{t({ tr: 'Başarılı', en: 'Successful' })}</option>
                <option value="partial">{t({ tr: 'Kısmen Başarılı', en: 'Partial' })}</option>
                <option value="failed">{t({ tr: 'Başarısız', en: 'Failed' })}</option>
                <option value="rolled_back">{t({ tr: 'Geri Alındı', en: 'Rolled Back' })}</option>
              </select>
              <textarea
                value={pirNotes}
                onChange={(e) => setPirNotes(e.target.value)}
                rows={3}
                placeholder={t({ tr: 'Beklenmeyen sorunlar, süreç önerisi…', en: 'Unexpected issues, process suggestions…' })}
                className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px] mb-2 resize-none"
              />
              <button
                onClick={() => updateChange.mutate({ pir_outcome: pirOutcome, pir_notes: pirNotes, status: 'closed' })}
                className="w-full py-2 rounded-lg bg-brand text-white text-[12.5px] font-bold"
              >
                {t({ tr: 'PIR\'i Tamamla ve Kapat', en: 'Complete PIR & Close' })}
              </button>
            </div>
          )}

          {change.pir_outcome && (
            <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3.5">
              <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase mb-1.5">PIR</div>
              <div className="text-[12.5px] font-semibold mb-1">{change.pir_outcome}</div>
              {change.pir_notes && <p className="text-[12px] text-[var(--text-sub)]">{change.pir_notes}</p>}
            </div>
          )}

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
    </Drawer>
  )
}
