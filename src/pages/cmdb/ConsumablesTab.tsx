import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, Plus, X, Package, RotateCcw } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import {
  useConsumableItems,
  useConsumableOutQuantities,
  useConsumableCheckouts,
  useCheckoutConsumable,
  useCheckinConsumable,
  type ConsumableItem,
} from './useConsumables'
import { useAssignableUsers } from '@/pages/oncall/useOnCall'

export function ConsumablesTab() {
  const { lang, t } = useLang()
  const { data: items, isLoading, error } = useConsumableItems()
  const { data: outQuantities } = useConsumableOutQuantities()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const lowStockItems = (items ?? []).filter((i) => i.total_quantity - (outQuantities?.get(i.id) ?? 0) <= i.low_stock_threshold)

  return (
    <div>
      {lowStockItems.length > 0 && (
        <div className="flex items-start gap-2.5 bg-p2-tint border border-p2/40 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-p2 shrink-0 mt-0.5" />
          <div>
            <div className="text-[12.5px] font-bold text-p2 mb-0.5">{t({ tr: 'Düşük Stok Uyarısı', en: 'Low Stock Warning' })}</div>
            <div className="text-[11.5px] text-[var(--text-sub)]">{lowStockItems.map((i) => i.name).join(' · ')}</div>
          </div>
        </div>
      )}

      {isLoading && (
        <p className="text-[13px] text-[var(--text-faint)] py-12 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
      )}
      {error && (
        <p className="text-[13px] text-p1 py-12 text-center">
          {t({ tr: 'Sarf malzemeleri yüklenemedi.', en: 'Failed to load consumables.' })}
        </p>
      )}
      {!isLoading && !error && !items?.length && (
        <p className="text-[13px] text-[var(--text-faint)] py-12 text-center">
          {t({ tr: 'Henüz sarf malzemesi veya aksesuar eklenmedi.', en: 'No consumables or accessories added yet.' })}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {items?.map((item) => {
          const out = outQuantities?.get(item.id) ?? 0
          const remaining = item.total_quantity - out
          const isLow = remaining <= item.low_stock_threshold
          const isOpen = expandedId === item.id
          return (
            <div key={item.id} className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] overflow-hidden">
              <button onClick={() => setExpandedId(isOpen ? null : item.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--row-hover)]">
                <div className="w-9 h-9 rounded-lg bg-brand-tint flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-brand-dim" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold flex items-center gap-1.5">
                    {item.name}
                    <span className="text-[9px] font-bold bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text-faint)] rounded-full px-1.5 py-0.5">
                      {item.is_returnable ? t({ tr: 'Aksesuar', en: 'Accessory' }) : t({ tr: 'Sarf Malzemesi', en: 'Consumable' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-faint)] mt-0.5">
                    {item.category ?? '—'} {item.site && `· ${item.site.name}`} {item.vendor && `· ${item.vendor.name}`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[13px] font-bold ${isLow ? 'text-p2' : 'text-[var(--text)]'}`}>
                    {remaining} / {item.total_quantity}
                  </span>
                  {item.unit_cost != null && (
                    <div className="text-[10px] text-[var(--text-faint)] mt-0.5">
                      ₺{(remaining * item.unit_cost).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                    </div>
                  )}
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-faint)] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--text-faint)] shrink-0" />}
              </button>
              {isOpen && <ConsumableDetailPanel item={item} remaining={remaining} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ConsumableDetailPanel({ item, remaining }: { item: ConsumableItem; remaining: number }) {
  const { lang, t } = useLang()
  const { data: checkouts } = useConsumableCheckouts(item.id)
  const { data: users } = useAssignableUsers()
  const checkout = useCheckoutConsumable()
  const checkin = useCheckinConsumable()

  const [userId, setUserId] = useState('')
  const [quantity, setQuantity] = useState(1)

  function handleCheckout() {
    if (!userId) return
    checkout.mutate({ consumableId: item.id, userId, quantity })
    setUserId('')
    setQuantity(1)
  }

  return (
    <div className="border-t border-[var(--border)] px-4 py-3.5 bg-[var(--panel-2)] space-y-3">
      <div className="flex items-center gap-1.5">
        <select value={userId} onChange={(e) => setUserId(e.target.value)} className="flex-1 text-[12px] bg-[var(--panel)] border border-[var(--border)] rounded-md px-2 py-1.5">
          <option value="">{t({ tr: 'Kişi seçin…', en: 'Select person…' })}</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={remaining}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-16 text-[12px] bg-[var(--panel)] border border-[var(--border)] rounded-md px-2 py-1.5"
        />
        <button
          onClick={handleCheckout}
          disabled={!userId || quantity < 1 || quantity > remaining || checkout.isPending}
          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-md bg-brand text-white disabled:opacity-40"
        >
          <Plus className="w-3.5 h-3.5" />
          {t({ tr: 'Teslim Et', en: 'Check Out' })}
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {!checkouts?.length && <p className="text-[11px] text-[var(--text-faint)] italic">{t({ tr: 'Henüz teslim edilmedi.', en: 'Not checked out yet.' })}</p>}
        {checkouts?.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-1.5">
            <span className="text-[12px]">
              <span className="font-semibold">{c.user?.full_name ?? '—'}</span>
              <span className="text-[var(--text-faint)]">
                {' '}
                · {c.quantity} {t({ tr: 'adet', en: 'unit(s)' })} · {new Date(c.checked_out_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}
              </span>
            </span>
            {item.is_returnable && !c.checked_in_at && (
              <button onClick={() => checkin.mutate(c.id)} className="flex items-center gap-1 text-[10.5px] font-bold text-brand-dim">
                <RotateCcw className="w-3 h-3" />
                {t({ tr: 'Geri Al', en: 'Check In' })}
              </button>
            )}
            {item.is_returnable && c.checked_in_at && <span className="text-[10.5px] text-ok font-semibold">{t({ tr: 'İade edildi', en: 'Returned' })}</span>}
            {!item.is_returnable && <X className="w-3 h-3 text-[var(--text-faint)]" />}
          </div>
        ))}
      </div>
    </div>
  )
}
