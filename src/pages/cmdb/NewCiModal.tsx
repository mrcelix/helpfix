import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateCi } from './useCmdb'
import { useAssetModels, useCreateAssetModel } from './useAssetOps'
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
  const { data: models } = useAssetModels()
  const createModel = useCreateAssetModel()

  const [name, setName] = useState('')
  const [ciType, setCiType] = useState<CiType>('laptop')
  const [serialNumber, setSerialNumber] = useState('')
  const [vendor, setVendor] = useState('')
  const [cost, setCost] = useState('')
  const [warrantyExpiry, setWarrantyExpiry] = useState('')
  const [siteId, setSiteId] = useState('')
  const [modelId, setModelId] = useState('')
  const [showNewModelForm, setShowNewModelForm] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [newModelManufacturer, setNewModelManufacturer] = useState('')

  const modelsForType = models?.filter((m) => m.ci_type === ciType) ?? []

  function applyModel(id: string) {
    setModelId(id)
    const model = models?.find((m) => m.id === id)
    if (model) {
      if (!name.trim()) setName(model.name)
      if (model.manufacturer) setVendor(model.manufacturer)
    }
  }

  async function handleCreateModel() {
    if (!newModelName.trim()) return
    const model = await createModel.mutateAsync({ name: newModelName.trim(), manufacturer: newModelManufacturer, ciType })
    applyModel(model.id)
    setNewModelName('')
    setNewModelManufacturer('')
    setShowNewModelForm(false)
  }

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
      model_id: modelId || null,
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
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Model (opsiyonel)', en: 'Model (optional)' })}
          </label>
          <div className="flex items-center gap-1.5">
            <select
              value={modelId}
              onChange={(e) => applyModel(e.target.value)}
              className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            >
              <option value="">{t({ tr: 'Model seçilmedi', en: 'No model selected' })}</option>
              {modelsForType.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.manufacturer ? `${m.manufacturer} — ${m.name}` : m.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewModelForm((s) => !s)}
              className="text-[11px] font-bold px-2.5 py-2 rounded-lg border border-[var(--border)] text-[var(--text-sub)] hover:border-brand hover:text-brand-dim shrink-0"
            >
              {t({ tr: '+ Yeni Model', en: '+ New Model' })}
            </button>
          </div>
          {showNewModelForm && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <input
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder={t({ tr: 'Model adı (örn. Latitude 5440)', en: 'Model name (e.g. Latitude 5440)' })}
                className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[12px]"
              />
              <input
                value={newModelManufacturer}
                onChange={(e) => setNewModelManufacturer(e.target.value)}
                placeholder={t({ tr: 'Üretici', en: 'Manufacturer' })}
                className="w-28 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[12px]"
              />
              <button
                type="button"
                onClick={handleCreateModel}
                disabled={!newModelName.trim() || createModel.isPending}
                className="text-[11px] font-bold px-2.5 py-1.5 rounded-md bg-brand text-white disabled:opacity-40 shrink-0"
              >
                {t({ tr: 'Ekle', en: 'Add' })}
              </button>
            </div>
          )}
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
