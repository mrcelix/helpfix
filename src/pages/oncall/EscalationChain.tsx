import { useState } from 'react'
import { Smartphone, Phone, Users, Plus, Trash2, ArrowRight } from 'lucide-react'
import { useLang, pickLang} from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { useEscalationSteps, useAddEscalationStep, useDeleteEscalationStep } from './useOnCall'

const METHOD_ICON: Record<string, typeof Smartphone> = { push: Smartphone, call: Phone, team_lead: Users }
const METHOD_LABEL: Record<string, { tr: string; en: string }> = {
  push: { tr: 'Push Bildirimi', en: 'Push Notification' },
  call: { tr: 'Telefon Araması', en: 'Phone Call' },
  team_lead: { tr: 'Ekip Lideri', en: 'Team Lead' },
}
const METHOD_COLOR: Record<string, string> = {
  push: 'bg-p3-tint text-[#8CA3FF]',
  call: 'bg-p2-tint text-p2',
  team_lead: 'bg-p1-tint text-p1',
}

export function EscalationChain({ scheduleId }: { scheduleId: string }) {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const canManage = profile && ['tenant_admin', 'manager'].includes(profile.role)
  const { data: steps, error: stepsError } = useEscalationSteps(scheduleId)
  const addStep = useAddEscalationStep(scheduleId)
  const deleteStep = useDeleteEscalationStep(scheduleId)
  const [delayMinutes, setDelayMinutes] = useState(5)
  const [method, setMethod] = useState<'push' | 'call' | 'team_lead'>('push')

  return (
    <div className="mb-6">
      <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
        {t({ tr: 'Eskalasyon Zinciri', en: 'Escalation Chain' })}
      </div>

      {!!steps?.length && (
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
          {steps.map((s, i) => {
            const Icon = METHOD_ICON[s.notify_method]
            return (
              <div key={s.id} className="flex items-center gap-1.5 shrink-0">
                <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 ${METHOD_COLOR[s.notify_method]}`}>
                  <Icon className="w-3.5 h-3.5" />
                  <div className="text-[10.5px] font-bold leading-tight">
                    {pickLang(METHOD_LABEL[s.notify_method], lang)}
                    <div className="text-[9px] opacity-80">
                      {i === 0
                        ? t({ tr: 'anında', en: 'immediately' })
                        : `+${s.delay_minutes} ${t({ tr: 'dk', en: 'min' })}`}
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => deleteStep.mutate(s.id)}
                      title={t({ tr: 'Adımı sil', en: 'Delete step' })}
                      aria-label={t({ tr: 'Adımı sil', en: 'Delete step' })}
                      className="opacity-60 hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {i < steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />}
              </div>
            )
          })}
        </div>
      )}
      {stepsError && (
        <p className="text-[11.5px] text-p1 mb-3">{t({ tr: 'Eskalasyon adımları yüklenemedi.', en: 'Failed to load escalation steps.' })}</p>
      )}
      {!steps?.length && !stepsError && (
        <p className="text-[11.5px] text-[var(--text-faint)] italic mb-3">
          {t({ tr: 'Henüz eskalasyon adımı tanımlanmadı.', en: 'No escalation steps defined yet.' })}
        </p>
      )}

      {canManage && (
        <div className="flex gap-1.5 items-end">
          <div className="flex-1">
            <label className="block text-[9.5px] font-bold text-[var(--text-faint)] uppercase mb-1">
              {t({ tr: 'Gecikme (dk)', en: 'Delay (min)' })}
            </label>
            <input
              type="number"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(Number(e.target.value))}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11.5px]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[9.5px] font-bold text-[var(--text-faint)] uppercase mb-1">
              {t({ tr: 'Yöntem', en: 'Method' })}
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11.5px]"
            >
              <option value="push">{pickLang(METHOD_LABEL.push, lang)}</option>
              <option value="call">{pickLang(METHOD_LABEL.call, lang)}</option>
              <option value="team_lead">{pickLang(METHOD_LABEL.team_lead, lang)}</option>
            </select>
          </div>
          <button
            onClick={() => addStep.mutate({ delayMinutes, notifyMethod: method })}
            className="text-[11px] font-bold px-3 py-[7px] rounded-lg bg-brand text-white shrink-0 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> {t({ tr: 'Ekle', en: 'Add' })}
          </button>
        </div>
      )}
    </div>
  )
}
