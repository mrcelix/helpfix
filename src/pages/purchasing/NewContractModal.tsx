import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateContract, useVendors, type ContractType } from './useProcurement'

const TYPES: ContractType[] = ['service', 'license', 'maintenance', 'lease', 'other']
const TYPE_LABEL: Record<ContractType, { tr: string; en: string }> = {
  service: { tr: 'Hizmet', en: 'Service' },
  license: { tr: 'Lisans', en: 'License' },
  maintenance: { tr: 'Bakım', en: 'Maintenance' },
  lease: { tr: 'Kiralama', en: 'Lease' },
  other: { tr: 'Diğer', en: 'Other' },
}

export function NewContractModal({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLang()
  const createContract = useCreateContract()
  const { data: vendors } = useVendors()

  const [name, setName] = useState('')
  const [contractType, setContractType] = useState<ContractType>('service')
  const [vendorId, setVendorId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [cost, setCost] = useState('')
  const [autoRenew, setAutoRenew] = useState(false)
  const [reminderDays, setReminderDays] = useState(30)

  async function handleSubmit() {
    if (!name.trim() || !startDate || !endDate) return
    await createContract.mutateAsync({
      name: name.trim(),
      contractType,
      vendorId: vendorId || null,
      startDate,
      endDate,
      cost: cost ? Number(cost) : null,
      autoRenew,
      renewalReminderDays: reminderDays,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Sözleşme', en: 'New Contract' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createContract.isPending || !name.trim() || !startDate || !endDate}>
            {createContract.isPending ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' }) : t({ tr: 'Oluştur', en: 'Create' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Sözleşme Adı', en: 'Contract Name' })}
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t({ tr: 'örn. Microsoft 365 Lisans Anlaşması', en: 'e.g. Microsoft 365 License Agreement' })}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Tip', en: 'Type' })}</label>
            <select value={contractType} onChange={(e) => setContractType(e.target.value as ContractType)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]">
              {TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {TYPE_LABEL[tp][lang]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Tedarikçi', en: 'Vendor' })}</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]">
              <option value="">{t({ tr: 'Yok', en: 'None' })}</option>
              {vendors?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Başlangıç', en: 'Start Date' })}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Bitiş', en: 'End Date' })}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Yıllık Maliyet (₺)', en: 'Annual Cost (₺)' })}</label>
            <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Hatırlatma (gün önce)', en: 'Reminder (days before)' })}</label>
            <input type="number" value={reminderDays} onChange={(e) => setReminderDays(Number(e.target.value))} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-[12px] text-[var(--text-sub)]">
          <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />
          {t({ tr: 'Otomatik yenilenir', en: 'Auto-renews' })}
        </label>
      </div>
    </Modal>
  )
}
