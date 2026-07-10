import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateBusinessService, type ServiceCriticality } from './useBusinessServices'
import { useAssignableUsers } from '@/pages/oncall/useOnCall'

const LEVELS: ServiceCriticality[] = ['critical', 'high', 'medium', 'low']
const LEVEL_LABEL: Record<ServiceCriticality, { tr: string; en: string }> = {
  critical: { tr: 'Kritik', en: 'Critical' },
  high: { tr: 'Yüksek', en: 'High' },
  medium: { tr: 'Orta', en: 'Medium' },
  low: { tr: 'Düşük', en: 'Low' },
}

export function NewBusinessServiceModal({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLang()
  const createService = useCreateBusinessService()
  const { data: users } = useAssignableUsers()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [criticality, setCriticality] = useState<ServiceCriticality>('medium')
  const [ownerId, setOwnerId] = useState('')

  async function handleSubmit() {
    if (!name.trim()) return
    await createService.mutateAsync({ name: name.trim(), description, criticality, ownerId: ownerId || null })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni İş Hizmeti', en: 'New Business Service' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createService.isPending || !name.trim()}>
            {createService.isPending ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' }) : t({ tr: 'Oluştur', en: 'Create' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Hizmet Adı', en: 'Service Name' })}</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t({ tr: 'örn. E-posta Hizmeti, POS Sistemi, VPN Hizmeti', en: 'e.g. Email Service, POS System, VPN Service' })}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Açıklama (opsiyonel)', en: 'Description (optional)' })}</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Kritiklik', en: 'Criticality' })}</label>
            <select value={criticality} onChange={(e) => setCriticality(e.target.value as ServiceCriticality)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]">
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l][lang]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Sahip', en: 'Owner' })}</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]">
              <option value="">{t({ tr: 'Yok', en: 'None' })}</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  )
}
