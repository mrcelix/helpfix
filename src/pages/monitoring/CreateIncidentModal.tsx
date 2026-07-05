import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateIncidentFromAlert } from './useMonitoring'

export function CreateIncidentModal({ alert, onClose }: { alert: { id: string; title: string }; onClose: () => void }) {
  const { t } = useLang()
  const createIncident = useCreateIncidentFromAlert()
  const [title, setTitle] = useState(alert.title)
  const [description, setDescription] = useState('')

  async function handleSubmit() {
    if (!title.trim()) return
    await createIncident.mutateAsync({ alertId: alert.id, title: title.trim(), description: description.trim(), ciId: null })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Uyarıdan Olay Oluştur', en: 'Create Incident from Alert' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createIncident.isPending || !title.trim()}>
            {createIncident.isPending ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' }) : t({ tr: 'Olay Oluştur', en: 'Create Incident' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
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
            rows={4}
            placeholder={t({ tr: 'Bu uyarıyla ilgili ek detay…', en: 'Additional context about this alert…' })}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand resize-none"
          />
        </div>
        <p className="text-[10.5px] text-[var(--text-faint)]">
          {t({ tr: 'Bu olay otomatik olarak P2 önceliğinde oluşturulacak ve uyarıyla bağlantılı kalacak.', en: 'This incident will be created as P2 priority and remain linked to the alert.' })}
        </p>
      </div>
    </Modal>
  )
}
