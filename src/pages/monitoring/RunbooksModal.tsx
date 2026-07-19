import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRunbooks, useCreateRunbook, useDeleteRunbook } from './useMonitoring'

export function RunbooksModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const { profile } = useAuth()
  const canManage = profile && ['tenant_admin', 'manager'].includes(profile.role)
  const { data: runbooks } = useRunbooks()
  const createRunbook = useCreateRunbook()
  const deleteRunbook = useDeleteRunbook()

  const [keyword, setKeyword] = useState('')
  const [title, setTitle] = useState('')
  const [steps, setSteps] = useState('')

  async function handleAdd() {
    if (!keyword.trim() || !title.trim()) return
    await createRunbook.mutateAsync({ triggerKeyword: keyword.trim(), title: title.trim(), steps })
    setKeyword('')
    setTitle('')
    setSteps('')
  }

  return (
    <Modal open onClose={onClose} title={t({ tr: 'Runbook\'lar (Otomatik İyileştirme Kılavuzları)', en: 'Runbooks (Auto-Remediation Guides)' })} widthClass="max-w-[560px]">
      <p className="text-[12px] text-[var(--text-faint)] mb-4">
        {t({
          tr: 'Bir uyarı başlığı belirlediğiniz anahtar kelimeyi içerdiğinde, teknisyene önceden tanımlı adım listesi gösterilir (gerçek otomatik komut çalıştırma değil, gerçek bir kontrol listesi).',
          en: 'When an alert title contains a keyword you define, the technician sees a predefined step list (not real script execution, but a real checklist).',
        })}
      </p>

      {canManage && (
        <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3 mb-4 space-y-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t({ tr: 'Anahtar kelime (örn. "disk kullanımı")', en: 'Keyword (e.g. "disk usage")' })}
            className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t({ tr: 'Runbook başlığı', en: 'Runbook title' })}
            className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
          />
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            rows={4}
            placeholder={t({ tr: 'Adımlar (her satır bir adım)…', en: 'Steps (one per line)…' })}
            className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px] resize-none"
          />
          <button onClick={handleAdd} disabled={createRunbook.isPending} className="w-full py-2 rounded-lg bg-brand text-white text-[12px] font-bold disabled:opacity-40">
            {t({ tr: 'Runbook Ekle', en: 'Add Runbook' })}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {runbooks?.map((r) => (
          <div key={r.id} className="flex items-center justify-between bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3.5 py-2.5">
            <div>
              <div className="text-[12.5px] font-bold">{r.title}</div>
              <div className="text-[10.5px] text-[var(--text-faint)] font-mono">"{r.trigger_keyword}"</div>
            </div>
            {canManage && (
              <button
                onClick={() => deleteRunbook.mutate(r.id)}
                title={t({ tr: 'Runbook\'u sil', en: 'Delete runbook' })}
                aria-label={t({ tr: 'Runbook\'u sil', en: 'Delete runbook' })}
                className="text-[var(--text-faint)] hover:text-p1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}
