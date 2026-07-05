import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateChange, useChangeTemplates } from './useChanges'
import type { ChangeType } from '@/types/database'

const TYPES: { key: ChangeType; label: { tr: string; en: string }; defaultRisk: number }[] = [
  { key: 'standard', label: { tr: 'Standart (Önceden Onaylı)', en: 'Standard (Pre-Approved)' }, defaultRisk: 10 },
  { key: 'normal', label: { tr: 'Normal', en: 'Normal' }, defaultRisk: 35 },
  { key: 'emergency', label: { tr: 'Acil', en: 'Emergency' }, defaultRisk: 70 },
]

function riskColor(score: number) {
  if (score >= 60) return 'text-p1'
  if (score >= 31) return 'text-p2'
  return 'text-ok'
}

export function NewChangeModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const createChange = useCreateChange()
  const { data: templates } = useChangeTemplates()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [changeType, setChangeType] = useState<ChangeType>('normal')
  const [riskScore, setRiskScore] = useState(35)
  const [category, setCategory] = useState('')
  const [rollbackPlan, setRollbackPlan] = useState('')

  function applyTemplate(templateId: string) {
    const tpl = templates?.find((t) => t.id === templateId)
    if (!tpl) return
    setTitle(tpl.name)
    setDescription(tpl.description ?? '')
    setCategory(tpl.category ?? '')
    setRiskScore(tpl.default_risk_score)
    setRollbackPlan(tpl.default_rollback_plan ?? '')
    setChangeType('standard')
  }

  function selectType(type: ChangeType, defaultRisk: number) {
    setChangeType(type)
    setRiskScore(defaultRisk)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await createChange.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      change_type: changeType,
      risk_score: riskScore,
      category: category.trim() || null,
      rollbackPlan: rollbackPlan.trim() || null,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Değişiklik', en: 'New Change' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createChange.isPending || !title.trim()}>
            {createChange.isPending ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' }) : t({ tr: 'Taslak Oluştur', en: 'Create Draft' })}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!!templates?.length && (
          <div className="bg-purple-tint/40 border border-purple/40 rounded-lg p-3">
            <label className="block text-[10.5px] font-bold text-purple uppercase tracking-wide mb-1.5">
              🚀 {t({ tr: 'Standart Şablondan Başlat', en: 'Start from Standard Template' })}
            </label>
            <select
              onChange={(e) => e.target.value && applyTemplate(e.target.value)}
              defaultValue=""
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
            >
              <option value="">{t({ tr: 'Şablon seçin (opsiyonel)…', en: 'Select a template (optional)…' })}</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Başlık', en: 'Title' })}
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Açıklama', en: 'Description' })}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand resize-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Değişiklik Tipi', en: 'Change Type' })}
          </label>
          <div className="flex gap-1.5">
            {TYPES.map((tp) => (
              <button
                type="button"
                key={tp.key}
                onClick={() => selectType(tp.key, tp.defaultRisk)}
                className={
                  'flex-1 text-[11.5px] font-bold py-2 rounded-lg border transition-colors ' +
                  (changeType === tp.key
                    ? 'bg-brand border-brand text-white'
                    : 'bg-[var(--panel-2)] border-[var(--border)] text-[var(--text-sub)]')
                }
              >
                {tp.label.tr}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="flex items-center justify-between text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            <span>{t({ tr: 'Risk Skoru', en: 'Risk Score' })}</span>
            <span className={`font-mono text-[13px] ${riskColor(riskScore)}`}>{riskScore}</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={riskScore}
            onChange={(e) => setRiskScore(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-[10.5px] text-[var(--text-faint)] mt-1">
            {riskScore >= 60
              ? t({ tr: '60+: Teknik İnceleme + CAB onayı gerekir', en: '60+: Requires Technical Review + CAB' })
              : t({ tr: 'Sadece CAB onayı gerekir', en: 'Only CAB approval required' })}
          </p>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Kategori', en: 'Category' })}
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Geri Alma Planı', en: 'Rollback Plan' })}
          </label>
          <textarea
            value={rollbackPlan}
            onChange={(e) => setRollbackPlan(e.target.value)}
            rows={2}
            placeholder={t({ tr: 'Bir şeyler ters giderse nasıl geri alınır…', en: 'How to roll back if something goes wrong…' })}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand resize-none"
          />
        </div>
      </form>
    </Modal>
  )
}
