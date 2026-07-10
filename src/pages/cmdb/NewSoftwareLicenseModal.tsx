import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateSoftwareLicense, type LicenseType } from './useSoftwareAssets'
import { useVendors } from '@/pages/purchasing/useProcurement'

const TYPES: LicenseType[] = ['subscription', 'perpetual', 'oem', 'open_source']
const TYPE_LABEL: Record<LicenseType, { tr: string; en: string }> = {
  subscription: { tr: 'Abonelik', en: 'Subscription' },
  perpetual: { tr: 'Kalıcı', en: 'Perpetual' },
  oem: { tr: 'OEM', en: 'OEM' },
  open_source: { tr: 'Açık Kaynak', en: 'Open Source' },
}

export function NewSoftwareLicenseModal({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLang()
  const createLicense = useCreateSoftwareLicense()
  const { data: vendors } = useVendors()

  const [name, setName] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [licenseType, setLicenseType] = useState<LicenseType>('subscription')
  const [totalSeats, setTotalSeats] = useState(5)
  const [costPerSeat, setCostPerSeat] = useState('')
  const [renewalDate, setRenewalDate] = useState('')

  async function handleSubmit() {
    if (!name.trim()) return
    await createLicense.mutateAsync({
      name: name.trim(),
      vendorId: vendorId || null,
      licenseType,
      totalSeats,
      costPerSeat: costPerSeat ? Number(costPerSeat) : null,
      renewalDate: renewalDate || null,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Yazılım Lisansı', en: 'New Software License' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createLicense.isPending || !name.trim()}>
            {createLicense.isPending ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' }) : t({ tr: 'Oluştur', en: 'Create' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Ürün Adı', en: 'Product Name' })}</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t({ tr: 'örn. Microsoft 365 E3', en: 'e.g. Microsoft 365 E3' })}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Lisans Tipi', en: 'License Type' })}</label>
            <select value={licenseType} onChange={(e) => setLicenseType(e.target.value as LicenseType)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]">
              {TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {TYPE_LABEL[tp][lang]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Toplam Koltuk', en: 'Total Seats' })}</label>
            <input type="number" min={0} value={totalSeats} onChange={(e) => setTotalSeats(Number(e.target.value))} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Koltuk Başı Maliyet (₺)', en: 'Cost per Seat (₺)' })}</label>
            <input type="number" value={costPerSeat} onChange={(e) => setCostPerSeat(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Yenileme Tarihi (opsiyonel)', en: 'Renewal Date (optional)' })}</label>
          <input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]" />
        </div>
      </div>
    </Modal>
  )
}
