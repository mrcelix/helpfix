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
  useFreezeConflict,
  useBlastRadius,
  useLinkChangeToCi,
} from './useChanges'
import { useConfigurationItems } from '@/pages/cmdb/useCmdb'
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
  const [scheduleDate, setScheduleDate] = useState('')
  const [showScheduleForm, setShowScheduleForm] = useState(false)

  const freezeConflict = useFreezeConflict(scheduleDate || null)
  const linkCi = useLinkChangeToCi(id)
  const { data: allCis } = useConfigurationItems('all')
  const { data: blastRadius } = useBlastRadius(change?.ci_id ?? null)

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

          {canManage && (
            <div>
              <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                {t({ tr: 'İlgili Varlık (Blast Radius için)', en: 'Related Asset (for Blast Radius)' })}
              </label>
              <select
                value={change.ci_id ?? ''}
                onChange={(e) => linkCi.mutate(e.target.value || null)}
                className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
              >
                <option value="">{t({ tr: 'Bağlı değil', en: 'Not linked' })}</option>
                {allCis?.map((ci) => (
                  <option key={ci.id} value={ci.id}>
                    {ci.name} ({ci.tag})
                  </option>
                ))}
              </select>

              {change.ci_id && (
                <div className="mt-2.5 bg-p2-tint border border-p2/40 rounded-lg p-3">
                  <div className="text-[11px] font-bold text-p2 uppercase mb-2">
                    ⚡ {t({ tr: 'Etki Alanı (Blast Radius)', en: 'Blast Radius' })}
                  </div>
                  {!blastRadius?.length ? (
                    <p className="text-[11.5px] text-[var(--text-faint)]">
                      {t({ tr: 'Bu varlığa bağlı başka bir sistem tespit edilmedi.', en: 'No other connected systems detected.' })}
                    </p>
                  ) : (
                    <>
                      <p className="text-[11.5px] text-[var(--text-sub)] mb-2">
                        {t({
                          tr: `Bu değişiklik başarısız olursa ${blastRadius.length} sistem daha etkilenebilir:`,
                          en: `If this change fails, ${blastRadius.length} more system(s) may be affected:`,
                        })}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {blastRadius.map((ci) => (
                          <span key={ci.id} className="text-[10.5px] font-mono bg-[var(--panel)] border border-[var(--border)] rounded-full px-2 py-0.5">
                            {ci.name}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
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
            <div>
              {!showScheduleForm ? (
                <button
                  onClick={() => setShowScheduleForm(true)}
                  className="w-full py-2.5 rounded-lg bg-brand text-white text-[13px] font-bold"
                >
                  {t({ tr: 'Planla', en: 'Schedule' })}
                </button>
              ) : (
                <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3 space-y-2">
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
                  />
                  {freezeConflict && (
                    <div className="bg-p1-tint border border-p1/40 rounded-lg p-2.5 text-[11.5px] text-p1">
                      ⚠️ {t({ tr: 'Bu tarih bir dondurma penceresiyle çakışıyor:', en: 'This date conflicts with a freeze window:' })}{' '}
                      <b>{freezeConflict.name}</b> ({new Date(freezeConflict.start_date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')} –{' '}
                      {new Date(freezeConflict.end_date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')})
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (!scheduleDate) return
                      updateChange.mutate({ status: 'scheduled', scheduled_start: new Date(scheduleDate).toISOString() })
                      setShowScheduleForm(false)
                    }}
                    disabled={!scheduleDate}
                    className={`w-full py-2 rounded-lg text-[12.5px] font-bold ${freezeConflict ? 'bg-p2 text-black/80' : 'bg-brand text-white'} disabled:opacity-40`}
                  >
                    {freezeConflict
                      ? t({ tr: 'Çakışmaya Rağmen Planla', en: 'Schedule Despite Conflict' })
                      : t({ tr: 'Onayla ve Planla', en: 'Confirm & Schedule' })}
                  </button>
                </div>
              )}
            </div>
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
