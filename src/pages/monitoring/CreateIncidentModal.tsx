import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateIncidentFromAlert } from './useMonitoring'

export function CreateIncidentModal({
  alert,
  onClose,
}: {
  alert: { id: string; title: string; description: string | null; ciId: string | null }
  onClose: () => void
}) {
  const { t } = useLang()
  const createIncident = useCreateIncidentFromAlert()
  const [title, setTitle] = useState(alert.title)
  const [description, setDescription] = useState(alert.description ?? '')
  const [submitError, setSubmitError] = useState('')

  async function handleSubmit() {
    if (!title.trim()) return
    setSubmitError('')
    try {
      await createIncident.mutateAsync({ alertId: alert.id, title: title.trim(), description: description.trim(), ciId: alert.ciId })
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    }
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
          {t({ tr: 'Bu olay otomatik olarak Acil önceliğinde oluşturulacak ve uyarıyla bağlantılı kalacak.', en: 'This incident will be created as Urgent priority and remain linked to the alert.' })}
        </p>
        {submitError && <p className="text-[12px] text-p1">{submitError}</p>}
      </div>
    </Modal>
  )
}
