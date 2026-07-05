import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateServiceRequest } from './useCatalog'
import type { FormFieldSchema } from './useCatalog'

export function RequestServiceModal({
  item,
  onClose,
}: {
  item: { id: string; name: string; requiresApproval: boolean; formSchema?: { fields: FormFieldSchema[] } | null }
  onClose: () => void
}) {
  const { t } = useLang()
  const createRequest = useCreateServiceRequest()
  const [notes, setNotes] = useState('')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)

  const fields = item.formSchema?.fields ?? []

  function isVisible(field: FormFieldSchema): boolean {
    if (!field.showIf) return true
    return formValues[field.showIf.field] === field.showIf.equals
  }

  async function handleSubmit() {
    await createRequest.mutateAsync({
      catalogItemId: item.id,
      notes,
      requiresApproval: item.requiresApproval,
      formData: fields.length ? formValues : undefined,
    })
    setDone(true)
  }

  if (done) {
    return (
      <Modal open onClose={onClose} title={t({ tr: 'Talep Gönderildi', en: 'Request Submitted' })}>
        <div className="text-center py-6">
          <div className="w-14 h-14 rounded-full bg-ok flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M5 12l4 4L19 6" />
            </svg>
          </div>
          <p className="text-[13px] text-[var(--text-sub)]">
            {item.requiresApproval
              ? t({ tr: 'Talebiniz onay için gönderildi.', en: 'Your request was sent for approval.' })
              : t({ tr: 'Talebiniz otomatik onaylandı, karşılanma sürecine alındı.', en: 'Your request was auto-approved and is being fulfilled.' })}
          </p>
          <Button onClick={onClose} className="mt-5">
            {t({ tr: 'Tamam', en: 'Done' })}
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createRequest.isPending}>
            {createRequest.isPending ? t({ tr: 'Gönderiliyor…', en: 'Submitting…' }) : t({ tr: 'Talep Et', en: 'Request' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Koşullu form mantığı: bir alanın görünürlüğü başka bir alanın
            değerine bağlı olabilir (örn. Cihaz Tipi="Laptop" ise RAM
            Tercihi alanı görünür). */}
        {fields.filter(isVisible).map((field) => (
          <div key={field.key}>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {field.label}
            </label>
            {field.type === 'select' ? (
              <select
                value={formValues[field.key] ?? ''}
                onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
              >
                <option value="">{t({ tr: 'Seçin…', en: 'Select…' })}</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={formValues[field.key] ?? ''}
                onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
              />
            )}
          </div>
        ))}

        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Ek Not (opsiyonel)', en: 'Additional Notes (optional)' })}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t({ tr: 'Talebinizle ilgili detay ekleyin…', en: 'Add detail about your request…' })}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand resize-none"
          />
        </div>
        {item.requiresApproval && (
          <p className="text-[11px] text-p2">
            ⚠️ {t({ tr: 'Bu hizmet onay gerektirir.', en: 'This service requires approval.' })}
          </p>
        )}
      </div>
    </Modal>
  )
}
