import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { priorityLabel } from '@/lib/priority'
import { useCreateRule } from './useAutomation'
import { useAssignableUsers } from '@/pages/oncall/useOnCall'
import type { Priority, AutomationAction, AutomationTrigger } from '@/types/database'

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4']
const TRIGGERS: { key: AutomationTrigger; label: { tr: string; en: string } }[] = [
  { key: 'incident_created', label: { tr: 'Yeni Olay', en: 'New Incident' } },
  { key: 'problem_created', label: { tr: 'Yeni Problem', en: 'New Problem' } },
  { key: 'change_created', label: { tr: 'Yeni Değişiklik', en: 'New Change' } },
]

export function NewRuleModal({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLang()
  const createRule = useCreateRule()
  const { data: users } = useAssignableUsers()

  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState<AutomationTrigger>('incident_created')
  const [conditionCategory, setConditionCategory] = useState('')
  const [conditionPriority, setConditionPriority] = useState<Priority | ''>('')
  const [actionType, setActionType] = useState<AutomationAction>('assign_to_user')
  const [actionAssigneeId, setActionAssigneeId] = useState('')
  const [actionPriority, setActionPriority] = useState<Priority>('P2')
  const [submitError, setSubmitError] = useState('')

  // "Yeni Değişiklik" tetikleyicisinde changes tablosunun priority sütunu
  // olmadığı için sunucu tarafı (apply_automation_rules_changes) hem
  // condition_priority'yi hem de set_priority eylemini yok sayar —
  // bu yüzden UI'da da bu iki alan bu tetikleyicide gösterilmiyor.
  const isChangeTrigger = triggerType === 'change_created'

  function selectTrigger(key: AutomationTrigger) {
    setTriggerType(key)
    if (key === 'change_created') {
      setConditionPriority('')
      if (actionType === 'set_priority') setActionType('assign_to_user')
    }
  }

  async function handleSubmit() {
    if (!name.trim()) return
    setSubmitError('')
    try {
      await createRule.mutateAsync({
        name: name.trim(),
        triggerType,
        conditionCategory: conditionCategory.trim() || null,
        conditionPriority: conditionPriority || null,
        actionType,
        actionAssigneeId: actionType === 'assign_to_user' ? actionAssigneeId || null : null,
        actionPriority: actionType === 'set_priority' ? actionPriority : null,
      })
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Otomasyon Kuralı', en: 'New Automation Rule' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createRule.isPending || !name.trim()}>
            {createRule.isPending ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' }) : t({ tr: 'Kuralı Oluştur', en: 'Create Rule' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Kural Adı', en: 'Rule Name' })}
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t({ tr: 'örn. Ağ sorunlarını otomatik ata', en: 'e.g. Auto-assign network issues' })}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Tetikleyici', en: 'Trigger' })}
          </label>
          <div className="flex gap-1.5">
            {TRIGGERS.map((tr) => (
              <button
                type="button"
                key={tr.key}
                onClick={() => selectTrigger(tr.key)}
                aria-pressed={triggerType === tr.key}
                className={`flex-1 text-[11px] font-bold py-2 rounded-lg border ${triggerType === tr.key ? 'bg-brand border-brand text-white' : 'bg-[var(--panel-2)] border-[var(--border)] text-[var(--text-sub)]'}`}
              >
                {t(tr.label)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3">
          <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase mb-2">
            {t({ tr: 'KOŞUL', en: 'CONDITION' })}
          </div>
          <div className={isChangeTrigger ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-2'}>
            <input
              value={conditionCategory}
              onChange={(e) => setConditionCategory(e.target.value)}
              placeholder={t({ tr: 'Kategori (boş = hepsi)', en: 'Category (empty = any)' })}
              className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
            />
            {!isChangeTrigger && (
              <select
                value={conditionPriority}
                onChange={(e) => setConditionPriority(e.target.value as Priority | '')}
                className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
              >
                <option value="">{t({ tr: 'Öncelik: Hepsi', en: 'Priority: Any' })}</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {priorityLabel(p, lang)}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="text-[10px] text-[var(--text-faint)] mt-1.5">
            {t({
              tr: 'Kategori, kaydın kategori metniyle birebir eşleşmelidir (örn. "Ağ & VPN – VPN bağlantı sorunu"); kısmi veya farklı yazımlı girişler eşleşmez.',
              en: 'Category must match the record\'s category text exactly (e.g. "Network & VPN – VPN connection issue"); partial or differently-worded entries won\'t match.',
            })}
          </p>
          {isChangeTrigger && (
            <p className="text-[10px] text-[var(--text-faint)] mt-1">
              {t({ tr: 'Değişikliklerde öncelik alanı yoktur, bu yüzden öncelik koşulu bu tetikleyicide kullanılamaz.', en: 'Changes have no priority field, so a priority condition is not available for this trigger.' })}
            </p>
          )}
        </div>

        <div className="bg-purple-tint/40 border border-purple/40 rounded-lg p-3">
          <div className="text-[10.5px] font-bold text-purple uppercase mb-2">{t({ tr: 'İŞLEM', en: 'ACTION' })}</div>
          <div className="flex gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => setActionType('assign_to_user')}
              aria-pressed={actionType === 'assign_to_user'}
              className={`flex-1 text-[11.5px] font-bold py-2 rounded-lg border ${actionType === 'assign_to_user' ? 'bg-purple border-purple text-white' : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]'}`}
            >
              {t({ tr: 'Ata', en: 'Assign' })}
            </button>
            <button
              type="button"
              onClick={() => setActionType('assign_by_skill')}
              aria-pressed={actionType === 'assign_by_skill'}
              className={`flex-1 text-[11.5px] font-bold py-2 rounded-lg border ${actionType === 'assign_by_skill' ? 'bg-purple border-purple text-white' : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]'}`}
            >
              {t({ tr: 'Beceriye Göre Ata', en: 'Assign by Skill' })}
            </button>
            {!isChangeTrigger && (
              <button
                type="button"
                onClick={() => setActionType('set_priority')}
                aria-pressed={actionType === 'set_priority'}
                className={`flex-1 text-[11.5px] font-bold py-2 rounded-lg border ${actionType === 'set_priority' ? 'bg-purple border-purple text-white' : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]'}`}
              >
                {t({ tr: 'Öncelik Ayarla', en: 'Set Priority' })}
              </button>
            )}
          </div>
          {actionType === 'assign_to_user' && (
            <select
              value={actionAssigneeId}
              onChange={(e) => setActionAssigneeId(e.target.value)}
              className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
            >
              <option value="">{t({ tr: 'Kullanıcı seçin…', en: 'Select user…' })}</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          )}
          {actionType === 'assign_by_skill' && (
            <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">
              {t({
                tr: 'Kaydın kategorisiyle eşleşen bir beceriye sahip, en az açık kaydı olan teknisyene otomatik atanır (eşitlikte en yüksek yetkinlik puanı kazanır). Teknisyen becerilerini Kullanıcı Yönetimi\'nden tanımlayabilirsiniz.',
                en: 'Automatically assigns to the technician with a matching skill for the record\'s category who has the fewest open records (ties broken by highest proficiency). Manage technician skills from User Management.',
              })}
            </p>
          )}
          {actionType === 'set_priority' && (
            <select
              value={actionPriority}
              onChange={(e) => setActionPriority(e.target.value as Priority)}
              className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityLabel(p, lang)}
                </option>
              ))}
            </select>
          )}
        </div>
        {submitError && <p className="text-[12px] text-p1">{submitError}</p>}
      </div>
    </Modal>
  )
}
