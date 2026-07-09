import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import {
  useCategories,
  useCreateCategory,
  useAllCatalogItemsAdmin,
  useCreateCatalogItem,
  useToggleCatalogItemActive,
} from '@/pages/catalog/useCatalog'

export function AdminCatalogTab() {
  const { lang, t } = useLang()
  const { data: categories } = useCategories()
  const createCategory = useCreateCategory()
  const { data: items, isLoading } = useAllCatalogItemsAdmin()
  const createItem = useCreateCatalogItem()
  const toggleActive = useToggleCatalogItemActive()

  const [newCategoryName, setNewCategoryName] = useState('')
  const [showItemForm, setShowItemForm] = useState(false)
  const [itemName, setItemName] = useState('')
  const [itemDesc, setItemDesc] = useState('')
  const [itemCategoryId, setItemCategoryId] = useState('')
  const [itemCost, setItemCost] = useState('')
  const [itemDays, setItemDays] = useState('')
  const [itemRequiresApproval, setItemRequiresApproval] = useState(true)

  function addCategory() {
    if (!newCategoryName.trim()) return
    createCategory.mutate(newCategoryName.trim())
    setNewCategoryName('')
  }

  async function addItem() {
    if (!itemName.trim()) return
    await createItem.mutateAsync({
      name: itemName.trim(),
      description: itemDesc,
      categoryId: itemCategoryId || null,
      estimatedCost: itemCost ? Number(itemCost) : null,
      estimatedDays: itemDays ? Number(itemDays) : null,
      requiresApproval: itemRequiresApproval,
    })
    setItemName('')
    setItemDesc('')
    setItemCost('')
    setItemDays('')
    setShowItemForm(false)
  }

  return (
    <div>
      {/* Kategoriler */}
      <div className="mb-6">
        <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
          {t({ tr: 'Kategoriler', en: 'Categories' })}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {categories?.map((c) => (
            <span key={c.id} className="text-[11.5px] font-semibold bg-[var(--panel)] border border-[var(--border)] rounded-full px-3 py-1.5">
              {c.name}
            </span>
          ))}
        </div>
        <div className="flex gap-2 max-w-sm">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            placeholder={t({ tr: 'Yeni kategori adı…', en: 'New category name…' })}
            className="flex-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12.5px]"
          />
          <button onClick={addCategory} className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hizmet Öğeleri */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide">
          {t({ tr: 'Hizmet Öğeleri', en: 'Catalog Items' })}
        </div>
        <button onClick={() => setShowItemForm((s) => !s)} className="text-[11px] font-bold text-brand-dim">
          {showItemForm ? t({ tr: 'Vazgeç', en: 'Cancel' }) : `+ ${t({ tr: 'Yeni Hizmet', en: 'New Service' })}`}
        </button>
      </div>

      {showItemForm && (
        <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3.5 mb-4 space-y-2">
          <input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder={t({ tr: 'Hizmet adı (örn. Yeni Dizüstü Bilgisayar)', en: 'Service name (e.g. New Laptop)' })}
            className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
          />
          <textarea
            value={itemDesc}
            onChange={(e) => setItemDesc(e.target.value)}
            rows={2}
            placeholder={t({ tr: 'Açıklama…', en: 'Description…' })}
            className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px] resize-none"
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={itemCategoryId}
              onChange={(e) => setItemCategoryId(e.target.value)}
              className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-2 text-[11.5px]"
            >
              <option value="">{t({ tr: 'Kategori seçin', en: 'Select category' })}</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={itemCost}
              onChange={(e) => setItemCost(e.target.value)}
              placeholder={t({ tr: 'Maliyet (₺)', en: 'Cost' })}
              className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-2 text-[11.5px]"
            />
            <input
              type="number"
              value={itemDays}
              onChange={(e) => setItemDays(e.target.value)}
              placeholder={t({ tr: 'Süre (gün)', en: 'Days' })}
              className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-2 text-[11.5px]"
            />
          </div>
          <label className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-sub)]">
            <input type="checkbox" checked={itemRequiresApproval} onChange={(e) => setItemRequiresApproval(e.target.checked)} />
            {t({ tr: 'Onay gerektirir', en: 'Requires approval' })}
          </label>
          <button onClick={addItem} disabled={createItem.isPending || !itemName.trim()} className="w-full py-2 rounded-lg bg-brand text-white text-[12px] font-bold disabled:opacity-40">
            {createItem.isPending ? t({ tr: 'Ekleniyor…', en: 'Adding…' }) : t({ tr: 'Hizmeti Ekle', en: 'Add Service' })}
          </button>
        </div>
      )}

      <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-x-auto bg-[var(--panel)]">
        <table className="w-full text-[12.5px] min-w-[720px]">
          <thead>
            <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
              <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">{t({ tr: 'Ad', en: 'Name' })}</th>
              <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">{t({ tr: 'Kategori', en: 'Category' })}</th>
              <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">{t({ tr: 'Maliyet', en: 'Cost' })}</th>
              <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">{t({ tr: 'Aktif', en: 'Active' })}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4} className="text-center py-8 text-[var(--text-faint)]">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</td></tr>
            )}
            {!isLoading && items?.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-[var(--text-faint)]">{t({ tr: 'Henüz hizmet eklenmedi.', en: 'No services added yet.' })}</td></tr>
            )}
            {items?.map((i) => (
              <tr key={i.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3.5 py-3 font-semibold">{i.name}</td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{i.category?.name ?? '—'}</td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{i.estimated_cost != null ? `₺${i.estimated_cost.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}` : '—'}</td>
                <td className="px-3.5 py-3">
                  <button
                    onClick={() => toggleActive.mutate({ id: i.id, isActive: !i.is_active })}
                    className={`w-9 h-5 rounded-full relative transition-colors ${i.is_active ? 'bg-ok' : 'bg-[var(--border)]'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${i.is_active ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
