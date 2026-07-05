import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useLang } from '@/contexts/LangContext'
import { useEscalationLevels, useCreateEscalationLevel, useDeleteEscalationLevel } from './useSla'
import type { EscalationNotifyRole } from '@/types/database'

const ROLE_LABEL: Record<EscalationNotifyRole, { tr: string; en: string }> = {
  agent: { tr: 'Atanan Teknisyen', en: 'Assigned Agent' },
  manager: { tr: 'Ekip Yöneticisi', en: 'Team Manager' },
  tenant_admin: { tr: 'Tenant Admin', en: 'Tenant Admin' },
}

export function EscalationMatrixModal({ policyId, policyName, onClose }: { policyId: string; policyName: string; onClose: () => void }) {
  const { lang, t } = useLang()
  const { data: levels, isLoading } = useEscalationLevels(policyId)
  const createLevel = useCreateEscalationLevel(policyId)
  const deleteLevel = useDeleteEscalationLevel(policyId)

  const [triggerPercent, setTriggerPercent] = useState(80)
  const [notifyRole, setNotifyRole] = useState<EscalationNotifyRole>('agent')

  function addLevel() {
    const nextLevel = (levels?.length ?? 0) + 1
    createLevel.mutate({ level: nextLevel, triggerPercent, notifyRole })
  }

  return (
    <Modal open onClose={onClose} title={`${t({ tr: 'Eskalasyon Matrisi', en: 'Escalation Matrix' })} — ${policyName}`} widthClass="max-w-[560px]">
      <p className="text-[12px] text-[var(--text-faint)] mb-4">
        {t({
          tr: 'Bir olay çözüm süresinin belirli bir yüzdesine ulaşınca, hangi rolün bilgilendirilmesi gerektiğini tanımlayın. Canlı İzleme ekranında gerçek zamanlı olarak hesaplanıp gösterilir.',
          en: 'Define which role should be notified once an incident reaches a certain percentage of its resolution time. Computed and shown live in the Monitoring screen.',
        })}
      </p>

      {isLoading && <p className="text-[var(--text-faint)] text-sm text-center py-4">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}

      <div className="space-y-2 mb-4">
        {levels?.map((lvl) => (
          <div key={lvl.id} className="flex items-center gap-3 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3.5 py-2.5">
            <span className="text-[11px] font-bold bg-brand-tint text-brand-dim rounded-full px-2 py-0.5 shrink-0">
              {t({ tr: 'Seviye', en: 'Level' })} {lvl.level}
            </span>
            <span className="text-[12.5px] flex-1">
              %{lvl.trigger_percent} {t({ tr: 'dolunca →', en: 'elapsed →' })} <b>{ROLE_LABEL[lvl.notify_role][lang]}</b>
            </span>
            <button onClick={() => deleteLevel.mutate(lvl.id)} className="text-[var(--text-faint)] hover:text-p1 shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {!levels?.length && !isLoading && (
          <p className="text-[11.5px] text-[var(--text-faint)] italic text-center py-2">
            {t({ tr: 'Henüz eskalasyon seviyesi tanımlanmadı.', en: 'No escalation levels defined yet.' })}
          </p>
        )}
      </div>

      <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3 flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[var(--text-faint)] uppercase mb-1">
            % {t({ tr: 'Doluş Eşiği', en: 'Elapsed Threshold' })}
          </label>
          <input
            type="number"
            value={triggerPercent}
            onChange={(e) => setTriggerPercent(Number(e.target.value))}
            className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-[var(--text-faint)] uppercase mb-1">
            {t({ tr: 'Bilgilendirilecek', en: 'Notify' })}
          </label>
          <select
            value={notifyRole}
            onChange={(e) => setNotifyRole(e.target.value as EscalationNotifyRole)}
            className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
          >
            {(['agent', 'manager', 'tenant_admin'] as EscalationNotifyRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r][lang]}
              </option>
            ))}
          </select>
        </div>
        <button onClick={addLevel} className="text-[12px] font-bold px-3.5 py-2 rounded-lg bg-brand text-white shrink-0">
          {t({ tr: 'Seviye Ekle', en: 'Add Level' })}
        </button>
      </div>
    </Modal>
  )
}
