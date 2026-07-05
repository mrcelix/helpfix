import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useLang } from '@/contexts/LangContext'
import { useChangeTemplates, useCreateChangeTemplate } from './useChanges'

export function ChangeTemplatesModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const { data: templates } = useChangeTemplates()
  const createTemplate = useCreateChangeTemplate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [riskScore, setRiskScore] = useState(10)
  const [rollbackPlan, setRollbackPlan] = useState('')

  async function handleAdd() {
    if (!name.trim()) return
    await createTemplate.mutateAsync({
      name: name.trim(),
      description,
      category,
      defaultRiskScore: riskScore,
      defaultRollbackPlan: rollbackPlan,
    })
    setName('')
    setDescription('')
    setCategory('')
    setRollbackPlan('')
  }

  return (
    <Modal open onClose={onClose} title={t({ tr: 'Standart Değişiklik Şablonları', en: 'Standard Change Templates' })} widthClass="max-w-[560px]">
      <p className="text-[12px] text-[var(--text-faint)] mb-4">
        {t({
          tr: 'Sık tekrarlanan, düşük riskli değişiklikler için hazır şablonlar oluşturun (örn. "Sunucu Yeniden Başlatma", "SSL Sertifikası Yenileme").',
          en: 'Create ready-made templates for frequently repeated, low-risk changes (e.g. "Server Restart", "SSL Certificate Renewal").',
        })}
      </p>

      <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3 mb-4 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t({ tr: 'Şablon adı…', en: 'Template name…' })}
          className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder={t({ tr: 'Açıklama…', en: 'Description…' })}
          className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px] resize-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={t({ tr: 'Kategori', en: 'Category' })}
            className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
          />
          <input
            type="number"
            value={riskScore}
            onChange={(e) => setRiskScore(Number(e.target.value))}
            placeholder={t({ tr: 'Varsayılan Risk Skoru', en: 'Default Risk Score' })}
            className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
          />
        </div>
        <textarea
          value={rollbackPlan}
          onChange={(e) => setRollbackPlan(e.target.value)}
          rows={2}
          placeholder={t({ tr: 'Varsayılan geri alma planı…', en: 'Default rollback plan…' })}
          className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px] resize-none"
        />
        <button onClick={handleAdd} disabled={createTemplate.isPending || !name.trim()} className="w-full py-2 rounded-lg bg-brand text-white text-[12px] font-bold disabled:opacity-40">
          {t({ tr: 'Şablonu Ekle', en: 'Add Template' })}
        </button>
      </div>

      <div className="space-y-2">
        {templates?.map((tpl) => (
          <div key={tpl.id} className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3.5 py-2.5">
            <div className="text-[12.5px] font-bold">{tpl.name}</div>
            <div className="text-[11px] text-[var(--text-faint)]">{tpl.category} · {t({ tr: 'Risk', en: 'Risk' })}: {tpl.default_risk_score}</div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
