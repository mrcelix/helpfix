import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreatePurchaseOrder, useVendors } from './useProcurement'

export function NewPurchaseOrderModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const createPo = useCreatePurchaseOrder()
  const { data: vendors } = useVendors()

  const [title, setTitle] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [totalCost, setTotalCost] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit() {
    if (!title.trim()) return
    await createPo.mutateAsync({
      title: title.trim(),
      vendorId: vendorId || null,
      totalCost: totalCost ? Number(totalCost) : 0,
      expectedDeliveryDate: deliveryDate || null,
      notes,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Satın Alma Siparişi', en: 'New Purchase Order' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createPo.isPending || !title.trim()}>
            {createPo.isPending ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' }) : t({ tr: 'Oluştur', en: 'Create' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Başlık', en: 'Title' })}</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t({ tr: 'örn. 10x Dell Latitude Laptop', en: 'e.g. 10x Dell Latitude Laptop' })}
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
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Toplam Tutar (₺)', en: 'Total Amount (₺)' })}</label>
            <input type="number" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Beklenen Teslimat', en: 'Expected Delivery' })}</label>
          <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]" />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{t({ tr: 'Not (opsiyonel)', en: 'Notes (optional)' })}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] resize-none" />
        </div>
      </div>
    </Modal>
  )
}
