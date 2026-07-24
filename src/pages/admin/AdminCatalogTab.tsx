import { useState, Fragment } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Workflow, ListPlus } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import {
  useCategories,
  useCreateCategory,
  useAllCatalogItemsAdmin,
  useCreateCatalogItem,
  useToggleCatalogItemActive,
  useUpdateCatalogItemApprovalChain,
  useUpdateCatalogItemFormSchema,
  approverTypeLabel,
  type RequestApprovalChainStep,
  type RequestApproverType,
  type FormFieldSchema,
} from '@/pages/catalog/useCatalog'
import { useAssignableUsers } from '@/pages/oncall/useOnCall'
import { FieldSchemaEditor } from '@/components/ui/DynamicFields'

export function AdminCatalogTab() {
  const { lang, t } = useLang()
  const { data: categories, error: categoriesError } = useCategories()
  const createCategory = useCreateCategory()
  const { data: items, isLoading, error: itemsError } = useAllCatalogItemsAdmin()
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
  const [editingChainFor, setEditingChainFor] = useState<string | null>(null)
  const [editingFormFor, setEditingFormFor] = useState<string | null>(null)

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
        {categoriesError && <p className="text-[11.5px] text-p1 mb-2">{t({ tr: 'Kategoriler yüklenemedi.', en: 'Failed to load categories.' })}</p>}
        {!categoriesError && !categories?.length && (
          <p className="text-[11.5px] text-[var(--text-faint)] italic mb-2.5">{t({ tr: 'Henüz kategori eklenmedi.', en: 'No categories added yet.' })}</p>
        )}
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
          <button
            onClick={addCategory}
            title={t({ tr: 'Kategori Ekle', en: 'Add Category' })}
            aria-label={t({ tr: 'Kategori Ekle', en: 'Add Category' })}
            className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center shrink-0"
          >
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
              <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">{t({ tr: 'Onay Zinciri', en: 'Approval Chain' })}</th>
              <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">{t({ tr: 'Talep Formu', en: 'Request Form' })}</th>
              <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">{t({ tr: 'Aktif', en: 'Active' })}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-8 text-[var(--text-faint)]">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</td></tr>
            )}
            {itemsError && (
              <tr><td colSpan={6} className="text-center py-10 text-p1">{t({ tr: 'Hizmetler yüklenemedi.', en: 'Failed to load services.' })}</td></tr>
            )}
            {!isLoading && !itemsError && items?.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-[var(--text-faint)]">{t({ tr: 'Henüz hizmet eklenmedi.', en: 'No services added yet.' })}</td></tr>
            )}
            {items?.map((i) => (
              <Fragment key={i.id}>
                <tr className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3.5 py-3 font-semibold">{i.name}</td>
                  <td className="px-3.5 py-3 text-[var(--text-sub)]">{i.category?.name ?? '—'}</td>
                  <td className="px-3.5 py-3 text-[var(--text-sub)]">{i.estimated_cost != null ? `₺${i.estimated_cost.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}` : '—'}</td>
                  <td className="px-3.5 py-3">
                    <button
                      onClick={() => setEditingChainFor(editingChainFor === i.id ? null : i.id)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-dim"
                    >
                      <Workflow className="w-3.5 h-3.5" />
                      {i.approval_chain?.length
                        ? i.approval_chain.map((s) => approverTypeLabel(s.type, lang)).join(' → ')
                        : t({ tr: 'Tek aşama (Tenant Admin)', en: 'Single stage (Tenant Admin)' })}
                    </button>
                  </td>
                  <td className="px-3.5 py-3">
                    <button
                      onClick={() => setEditingFormFor(editingFormFor === i.id ? null : i.id)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-dim"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                      {i.form_schema?.fields?.length
                        ? t({ tr: `${i.form_schema.fields.length} alan`, en: `${i.form_schema.fields.length} fields` })
                        : t({ tr: 'Alan yok', en: 'No fields' })}
                    </button>
                  </td>
                  <td className="px-3.5 py-3">
                    <button
                      onClick={() => toggleActive.mutate({ id: i.id, isActive: !i.is_active })}
                      aria-pressed={i.is_active}
                      title={i.is_active ? t({ tr: 'Aktif — devre dışı bırak', en: 'Active — disable' }) : t({ tr: 'Pasif — etkinleştir', en: 'Inactive — enable' })}
                      aria-label={i.is_active ? t({ tr: 'Aktif — devre dışı bırak', en: 'Active — disable' }) : t({ tr: 'Pasif — etkinleştir', en: 'Inactive — enable' })}
                      className={`w-9 h-5 rounded-full relative transition-colors ${i.is_active ? 'bg-ok' : 'bg-[var(--border)]'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${i.is_active ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </td>
                </tr>
                {editingChainFor === i.id && (
                  <tr className="border-b border-[var(--border)]">
                    <td colSpan={6} className="px-3.5 py-3 bg-[var(--panel-2)]">
                      <ApprovalChainEditor itemId={i.id} initialChain={i.approval_chain ?? []} onDone={() => setEditingChainFor(null)} />
                    </td>
                  </tr>
                )}
                {editingFormFor === i.id && (
                  <tr className="border-b border-[var(--border)]">
                    <td colSpan={6} className="px-3.5 py-3 bg-[var(--panel-2)]">
                      <RequestFormEditor itemId={i.id} initialFields={i.form_schema?.fields ?? []} onDone={() => setEditingFormFor(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ApprovalChainEditor({
  itemId,
  initialChain,
  onDone,
}: {
  itemId: string
  initialChain: RequestApprovalChainStep[]
  onDone: () => void
}) {
  const { lang, t } = useLang()
  const updateChain = useUpdateCatalogItemApprovalChain()
  const { data: users } = useAssignableUsers()
  const [chain, setChain] = useState<RequestApprovalChainStep[]>(initialChain)

  function addStage() {
    setChain((c) => [...c, { type: 'department_manager' }])
  }
  function removeStage(idx: number) {
    setChain((c) => c.filter((_, i) => i !== idx))
  }
  function moveStage(idx: number, dir: -1 | 1) {
    setChain((c) => {
      const next = [...c]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return c
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }
  function updateStageType(idx: number, type: RequestApproverType) {
    setChain((c) => c.map((s, i) => (i === idx ? { type, approver_id: type === 'specific_user' ? s.approver_id : undefined } : s)))
  }
  function updateStageUser(idx: number, approverId: string) {
    setChain((c) => c.map((s, i) => (i === idx ? { ...s, approver_id: approverId } : s)))
  }

  const hasUnassignedApprover = chain.some((s) => s.type === 'specific_user' && !s.approver_id)

  async function save() {
    if (hasUnassignedApprover) return
    await updateChain.mutateAsync({ id: itemId, chain })
    onDone()
  }

  return (
    <div className="max-w-lg">
      <p className="text-[11px] text-[var(--text-faint)] mb-2.5">
        {t({
          tr: 'Boş bırakılırsa (aşama eklenmezse) talep tek aşamalı Tenant Admin onayına düşer.',
          en: 'If left empty (no stages added), the request falls back to single-stage Tenant Admin approval.',
        })}
      </p>
      <div className="flex flex-col gap-1.5 mb-3">
        {chain.map((step, idx) => (
          <div key={idx} className="flex items-center gap-1.5 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-1.5">
            <span className="text-[10.5px] font-bold text-[var(--text-faint)] w-5 shrink-0">{idx + 1}.</span>
            <select
              value={step.type}
              onChange={(e) => updateStageType(idx, e.target.value as RequestApproverType)}
              className="text-[11.5px] font-semibold bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1"
            >
              <option value="department_manager">{approverTypeLabel('department_manager', lang)}</option>
              <option value="tenant_admin">{approverTypeLabel('tenant_admin', lang)}</option>
              <option value="specific_user">{approverTypeLabel('specific_user', lang)}</option>
            </select>
            {step.type === 'specific_user' && (
              <select
                value={step.approver_id ?? ''}
                onChange={(e) => updateStageUser(idx, e.target.value)}
                className="text-[11.5px] bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1 flex-1"
              >
                <option value="" disabled>
                  {t({ tr: 'Kişi seçin…', en: 'Select person…' })}
                </option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            )}
            <div className="ml-auto flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => moveStage(idx, -1)}
                disabled={idx === 0}
                title={t({ tr: 'Yukarı taşı', en: 'Move up' })}
                aria-label={t({ tr: 'Yukarı taşı', en: 'Move up' })}
                className="disabled:opacity-30 text-[var(--text-faint)]"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => moveStage(idx, 1)}
                disabled={idx === chain.length - 1}
                title={t({ tr: 'Aşağı taşı', en: 'Move down' })}
                aria-label={t({ tr: 'Aşağı taşı', en: 'Move down' })}
                className="disabled:opacity-30 text-[var(--text-faint)]"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => removeStage(idx)}
                title={t({ tr: 'Aşamayı sil', en: 'Remove stage' })}
                aria-label={t({ tr: 'Aşamayı sil', en: 'Remove stage' })}
                className="text-[var(--text-faint)] hover:text-p1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {!chain.length && (
          <p className="text-[11px] text-[var(--text-faint)] italic py-1.5">{t({ tr: 'Henüz aşama eklenmedi.', en: 'No stages added yet.' })}</p>
        )}
        {hasUnassignedApprover && (
          <p className="text-[11px] text-p1 py-1">{t({ tr: 'Belirli kişi aşamaları için kişi seçmelisiniz.', en: 'You must select a person for specific-person stages.' })}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={addStage} className="flex items-center gap-1 text-[11px] font-bold text-brand-dim">
          <Plus className="w-3.5 h-3.5" />
          {t({ tr: 'Aşama Ekle', en: 'Add Stage' })}
        </button>
        <button
          onClick={save}
          disabled={updateChain.isPending || hasUnassignedApprover}
          className="ml-auto text-[11px] font-bold px-3 py-1.5 rounded-md bg-brand text-white disabled:opacity-40"
        >
          {updateChain.isPending ? t({ tr: 'Kaydediliyor…', en: 'Saving…' }) : t({ tr: 'Kaydet', en: 'Save' })}
        </button>
        <button onClick={onDone} className="text-[11px] font-semibold text-[var(--text-faint)]">
          {t({ tr: 'Vazgeç', en: 'Cancel' })}
        </button>
      </div>
    </div>
  )
}

function RequestFormEditor({
  itemId,
  initialFields,
  onDone,
}: {
  itemId: string
  initialFields: FormFieldSchema[]
  onDone: () => void
}) {
  const { t } = useLang()
  const updateFormSchema = useUpdateCatalogItemFormSchema()
  const [fields, setFields] = useState<FormFieldSchema[]>(initialFields)

  async function save() {
    await updateFormSchema.mutateAsync({ id: itemId, fields })
    onDone()
  }

  return (
    <div className="max-w-lg">
      <p className="text-[11px] text-[var(--text-faint)] mb-2.5">
        {t({
          tr: 'Bu hizmet talep edilirken standart not alanına ek olarak gösterilecek özel alanlar. Her alanın altındaki açılır menüden, o alanı başka bir alanın belirli bir değerine bağlı olarak göstermeyi seçebilirsiniz ("Bağlı görünür").',
          en: 'Custom fields shown in addition to the standard notes field when this service is requested. Use the dropdown under each field to make it visible only when another field has a specific value.',
        })}
      </p>
      <FieldSchemaEditor fields={fields} onChange={setFields} />
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={save}
          disabled={updateFormSchema.isPending}
          className="text-[11px] font-bold px-3 py-1.5 rounded-md bg-brand text-white disabled:opacity-40"
        >
          {updateFormSchema.isPending ? t({ tr: 'Kaydediliyor…', en: 'Saving…' }) : t({ tr: 'Kaydet', en: 'Save' })}
        </button>
        <button onClick={onDone} className="text-[11px] font-semibold text-[var(--text-faint)]">
          {t({ tr: 'Vazgeç', en: 'Cancel' })}
        </button>
      </div>
    </div>
  )
}
