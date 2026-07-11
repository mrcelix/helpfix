import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateConsumableItem } from './useConsumables'
import { useVendors } from '@/pages/purchasing/useProcurement'
import { useSites } from '@/pages/admin/useSites'

export function NewConsumableModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const createItem = useCreateConsumableItem()
  const { data: vendors } = useVendors()
  const { data: sites } = useSites()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [isReturnable, setIsReturnable] = useState(false)
  const [totalQuantity, setTotalQuantity] = useState(10)
  const [lowStockThreshold, setLowStockThreshold] = useState(5)
  const [unitCost, setUnitCost] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [siteId, setSiteId] = useState('')

  async function handleSubmit() {
    if (!name.trim()) return
    await createItem.mutateAsync({
      name: name.trim(),
      category,
      isReturnable,
      totalQuantity,
      lowStockThreshold,
      unitCost: unitCost ? Number(unitCost) : null,
      vendorId: vendorId || null,
      siteId: siteId || null,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Sarf Malzemesi / Aksesuar', en: 'New Consumable / Accessory' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createItem.isPending || !name.trim()}>
            {createItem.isPending ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' }) : t({ tr: 'Oluştur', en: 'Create' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Ad', en: 'Name' })}</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t({ tr: 'örn. HP 05A Toner, USB-C Kablo, Kablosuz Mouse', en: 'e.g. HP 05A Toner, USB-C Cable, Wireless Mouse' })}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
          />
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setIsReturnable(false)}
            className={`flex-1 text-[11.5px] font-bold py-2 rounded-lg border ${!isReturnable ? 'bg-purple border-purple text-white' : 'bg-[var(--panel-2)] border-[var(--border)] text-[var(--text-sub)]'}`}
          >
            {t({ tr: 'Sarf Malzemesi (tüketilir)', en: 'Consumable (used up)' })}
          </button>
          <button
            type="button"
            onClick={() => setIsReturnable(true)}
            className={`flex-1 text-[11.5px] font-bold py-2 rounded-lg border ${isReturnable ? 'bg-purple border-purple text-white' : 'bg-[var(--panel-2)] border-[var(--border)] text-[var(--text-sub)]'}`}
          >
            {t({ tr: 'Aksesuar (iade edilir)', en: 'Accessory (returned)' })}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Kategori', en: 'Category' })}</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Birim Maliyet (₺)', en: 'Unit Cost (₺)' })}</label>
            <input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Toplam Miktar', en: 'Total Quantity' })}</label>
            <input type="number" min={0} value={totalQuantity} onChange={(e) => setTotalQuantity(Number(e.target.value))} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Düşük Stok Eşiği', en: 'Low Stock Threshold' })}</label>
            <input type="number" min={0} value={lowStockThreshold} onChange={(e) => setLowStockThreshold(Number(e.target.value))} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Tedarikçi', en: 'Vendor' })}</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[13px]">
              <option value="">{t({ tr: 'Yok', en: 'None' })}</option>
              {vendors?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Site', en: 'Site' })}</label>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[13px]">
              <option value="">{t({ tr: 'Yok', en: 'None' })}</option>
              {sites?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  )
}
