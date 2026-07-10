import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateCi } from './useCmdb'
import { useSites } from '@/pages/admin/useSites'
import type { CiType } from '@/types/database'

const TYPES: { key: CiType; label: { tr: string; en: string } }[] = [
  { key: 'laptop', label: { tr: 'Dizüstü', en: 'Laptop' } },
  { key: 'desktop', label: { tr: 'Masaüstü', en: 'Desktop' } },
  { key: 'server', label: { tr: 'Sunucu', en: 'Server' } },
  { key: 'network_device', label: { tr: 'Ağ Cihazı', en: 'Network Device' } },
  { key: 'mobile_device', label: { tr: 'Mobil Cihaz', en: 'Mobile Device' } },
  { key: 'software_license', label: { tr: 'Yazılım Lisansı', en: 'Software License' } },
  { key: 'other', label: { tr: 'Diğer', en: 'Other' } },
]

export function NewCiModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const createCi = useCreateCi()
  const { data: sites } = useSites()

  const [name, setName] = useState('')
  const [ciType, setCiType] = useState<CiType>('laptop')
  const [serialNumber, setSerialNumber] = useState('')
  const [vendor, setVendor] = useState('')
  const [cost, setCost] = useState('')
  const [warrantyExpiry, setWarrantyExpiry] = useState('')
  const [siteId, setSiteId] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createCi.mutateAsync({
      name: name.trim(),
      ci_type: ciType,
      serial_number: serialNumber.trim(),
      vendor: vendor.trim(),
      cost: cost ? Number(cost) : null,
      warranty_expiry: warrantyExpiry || null,
      site_id: siteId || null,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Varlık', en: 'New Asset' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createCi.isPending || !name.trim()}>
            {createCi.isPending ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' }) : t({ tr: 'Varlığı Ekle', en: 'Add Asset' })}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Ad', en: 'Name' })}
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='MacBook Pro 14"'
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Tip', en: 'Type' })}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((tp) => (
              <button
                type="button"
                key={tp.key}
                onClick={() => setCiType(tp.key)}
                className={
                  'text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ' +
                  (ciType === tp.key
                    ? 'bg-brand border-brand text-white'
                    : 'bg-[var(--panel-2)] border-[var(--border)] text-[var(--text-sub)]')
                }
              >
                {tp.label.tr}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Seri No', en: 'Serial Number' })}
            </label>
            <input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Tedarikçi', en: 'Vendor' })}
            </label>
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Maliyet (₺)', en: 'Cost' })}
            </label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Garanti Bitiş', en: 'Warranty Expiry' })}
            </label>
            <input
              type="date"
              value={warrantyExpiry}
              onChange={(e) => setWarrantyExpiry(e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Site', en: 'Site' })}
            </label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
            >
              <option value="">{t({ tr: 'Yok', en: 'None' })}</option>
              {sites?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  )
}
