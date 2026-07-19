import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import {
  useSchedules,
  useCurrentOnCall,
  useUpcomingShifts,
  useMySwapRequests,
  useDecideSwap,
  useCreateSchedule,
  useOnCallFairness,
  type Shift,
} from './useOnCall'
import { NewShiftModal } from './NewShiftModal'
import { SwapRequestModal } from './SwapRequestModal'
import { EscalationChain } from './EscalationChain'

export function OnCallPage() {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const canManage = profile && ['tenant_admin', 'manager'].includes(profile.role)
  const [scheduleId, setScheduleId] = useState<string | null>(null)
  const [showNewShift, setShowNewShift] = useState(false)
  const [swapShift, setSwapShift] = useState<Shift | null>(null)
  const [newScheduleName, setNewScheduleName] = useState('')
  const [showNewSchedule, setShowNewSchedule] = useState(false)

  const { data: schedules, isLoading: schedulesLoading, error: schedulesError } = useSchedules()
  const activeScheduleId = scheduleId ?? schedules?.[0]?.id ?? null
  const { data: fairness, error: fairnessError } = useOnCallFairness(activeScheduleId)
  const { data: current, error: currentError } = useCurrentOnCall(activeScheduleId)
  const { data: upcoming, error: upcomingError } = useUpcomingShifts(activeScheduleId)
  const { data: swapRequests, error: swapRequestsError } = useMySwapRequests()
  const decideSwap = useDecideSwap()
  const createSchedule = useCreateSchedule()

  const myPendingDecisions = swapRequests?.filter((r) => r.status === 'pending')

  async function addSchedule() {
    if (!newScheduleName.trim()) return
    try {
      await createSchedule.mutateAsync(newScheduleName.trim())
      setNewScheduleName('')
      setShowNewSchedule(false)
    } catch {
      // global MutationCache.onError toast'u kullanıcıya hatayı gösterir
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">On-Call</h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Nöbet çizelgesi, eskalasyon ve vardiya değişimi', en: 'On-call schedule, escalation, and shift swaps' })}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowNewShift(true)} disabled={!activeScheduleId}>
            <Plus className="w-[15px] h-[15px]" />
            {t({ tr: 'Vardiya Ekle', en: 'Add Shift' })}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {schedules?.map((s) => (
          <button
            key={s.id}
            onClick={() => setScheduleId(s.id)}
            aria-pressed={activeScheduleId === s.id}
            className={
              'text-[12.5px] font-bold px-3.5 py-2 rounded-lg border transition-colors ' +
              (activeScheduleId === s.id
                ? 'bg-brand border-brand text-white'
                : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]')
            }
          >
            {s.name}
          </button>
        ))}
        {canManage && (!showNewSchedule ? (
          <button
            onClick={() => setShowNewSchedule(true)}
            className="text-[12.5px] font-bold px-3.5 py-2 rounded-lg border border-dashed border-[var(--border)] text-[var(--text-faint)]"
          >
            + {t({ tr: 'Çizelge', en: 'Schedule' })}
          </button>
        ) : (
          <div className="flex gap-1.5">
            <input
              autoFocus
              value={newScheduleName}
              onChange={(e) => setNewScheduleName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSchedule()}
              placeholder={t({ tr: 'Çizelge adı…', en: 'Schedule name…' })}
              className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12.5px]"
            />
            <button onClick={addSchedule} className="text-[12px] font-bold px-3 rounded-lg bg-brand text-white">
              {t({ tr: 'Ekle', en: 'Add' })}
            </button>
          </div>
        ))}
      </div>

      {schedulesLoading && (
        <p className="text-[var(--text-faint)] text-sm py-14 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
      )}
      {schedulesError && (
        <p className="text-p1 text-sm py-14 text-center">{t({ tr: 'Çizelgeler yüklenemedi.', en: 'Failed to load schedules.' })}</p>
      )}
      {!schedulesLoading && !schedulesError && !schedules?.length && (
        <p className="text-[var(--text-faint)] text-sm py-14 text-center">
          {t({ tr: 'Henüz bir nöbet çizelgesi yok — yukarıdan oluşturun.', en: 'No on-call schedule yet — create one above.' })}
        </p>
      )}

      {activeScheduleId && (
        <>
          {/* Şu an nöbetçi hero banner */}
          <div className="bg-gradient-to-br from-brand/15 to-transparent border border-brand rounded-2xl p-5 mb-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-ok mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
              {t({ tr: 'ŞU AN NÖBETTE', en: 'CURRENTLY ON CALL' })}
            </div>
            {currentError ? (
              <div className="text-[13px] text-p1">{t({ tr: 'Nöbetçi bilgisi yüklenemedi.', en: 'Failed to load on-call info.' })}</div>
            ) : current ? (
              <>
                <div className="font-display text-xl font-bold">{current.user?.full_name}</div>
                <div className="text-[12px] text-[var(--text-faint)] mt-1">
                  {new Date(current.end_time).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')} {t({ tr: "'a kadar", en: 'until' })}
                </div>
                <button onClick={() => setSwapShift(current)} className="mt-3 text-[12px] font-bold text-brand-dim">
                  {t({ tr: 'Değişim Talep Et', en: 'Request Swap' })}
                </button>
              </>
            ) : (
              <div className="text-[13px] text-[var(--text-faint)]">{t({ tr: 'Şu an atanmış nöbetçi yok', en: 'No one currently on call' })}</div>
            )}
          </div>

          {swapRequestsError && (
            <p className="text-p1 text-[12px] mb-4">{t({ tr: 'Değişim talepleri yüklenemedi.', en: 'Failed to load swap requests.' })}</p>
          )}
          {!!myPendingDecisions?.length && (
            <div className="mb-6">
              <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
                {t({ tr: 'Bekleyen Değişim Talepleri', en: 'Pending Swap Requests' })}
              </div>
              <div className="space-y-2">
                {myPendingDecisions.map((r) => (
                  <div key={r.id} className="flex items-center justify-between bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3.5 py-2.5">
                    <span className="text-[12.5px]">
                      <b>{r.requested_by_user?.full_name}</b> → <b>{r.requested_to_user?.full_name}</b>
                      {r.shift && <span className="text-[var(--text-faint)]"> · {new Date(r.shift.start_time).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>}
                    </span>
                    {profile?.id === r.requested_to ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => decideSwap.mutate({ id: r.id, status: 'approved' })} className="text-[10.5px] font-bold px-2 py-1 rounded-md bg-ok text-white">
                          {t({ tr: 'Onayla', en: 'Approve' })}
                        </button>
                        <button onClick={() => decideSwap.mutate({ id: r.id, status: 'rejected' })} className="text-[10.5px] font-bold px-2 py-1 rounded-md bg-[var(--panel-2)] border border-[var(--border)]">
                          {t({ tr: 'Reddet', en: 'Reject' })}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10.5px] text-[var(--text-faint)] italic">
                        {t({ tr: 'Kararı bekleniyor', en: 'Awaiting decision' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <EscalationChain scheduleId={activeScheduleId} />

          {fairnessError && (
            <p className="text-p1 text-[12px] mb-4">{t({ tr: 'Adalet analitiği yüklenemedi.', en: 'Failed to load fairness analytics.' })}</p>
          )}
          {!!fairness?.length && (
            <div className="mb-6">
              <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
                {t({ tr: 'Adalet Analitiği (Son 30 Gün)', en: 'Fairness Analytics (Last 30 Days)' })}
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {fairness.map((f) => (
                  <div key={f.user_id} className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-3">
                    <div className="font-semibold text-[12.5px] truncate mb-1">{f.full_name}</div>
                    <div className="text-[11px] text-[var(--text-faint)]">
                      {f.shift_count} {t({ tr: 'vardiya', en: 'shifts' })} · {f.total_hours} {t({ tr: 'saat', en: 'hours' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
            {t({ tr: 'Yaklaşan Vardiyalar', en: 'Upcoming Shifts' })}
          </div>
          <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-x-auto bg-[var(--panel)]">
            <table className="w-full text-[12.5px] min-w-[720px]">
              <tbody>
                {upcomingError && (
                  <tr>
                    <td className="text-center py-10 text-p1">{t({ tr: 'Vardiyalar yüklenemedi.', en: 'Failed to load shifts.' })}</td>
                  </tr>
                )}
                {!upcomingError && upcoming?.length === 0 && (
                  <tr>
                    <td className="text-center py-10 text-[var(--text-faint)]">{t({ tr: 'Yaklaşan vardiya yok.', en: 'No upcoming shifts.' })}</td>
                  </tr>
                )}
                {upcoming?.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3.5 py-3 font-semibold">{s.user?.full_name}</td>
                    <td className="px-3.5 py-3 text-[var(--text-sub)]">
                      {new Date(s.start_time).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')} →{' '}
                      {new Date(s.end_time).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <button onClick={() => setSwapShift(s)} className="text-[11px] font-bold text-brand-dim">
                        {t({ tr: 'Değiş', en: 'Swap' })}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showNewShift && activeScheduleId && <NewShiftModal scheduleId={activeScheduleId} onClose={() => setShowNewShift(false)} />}
      {swapShift && <SwapRequestModal shift={swapShift} onClose={() => setSwapShift(null)} />}
    </div>
  )
}
