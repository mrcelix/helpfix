import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'

export interface FormFieldSchema {
  key: string
  label: string
  type: 'select' | 'text'
  options?: string[]
  /** Bu alan sadece başka bir alanın belirli bir değeri olduğunda görünür
   * (örn. Cihaz Tipi="Laptop" ise RAM Tercihi görünür). */
  showIf?: { field: string; equals: string }
}

// ------------------------------------------------------------------
// EDİTÖR — Admin panellerinde (Katalog Öğesi, Talep Kategorisi) alan
// şeması tanımlamak için paylaşılan sürükle-bırak olmayan basit builder.
// ------------------------------------------------------------------
export function FieldSchemaEditor({
  fields,
  onChange,
}: {
  fields: FormFieldSchema[]
  onChange: (fields: FormFieldSchema[]) => void
}) {
  const { t } = useLang()

  function addField() {
    onChange([...fields, { key: `alan_${fields.length + 1}`, label: '', type: 'text' }])
  }
  function removeField(idx: number) {
    const removedKey = fields[idx].key
    onChange(
      fields
        .filter((_, i) => i !== idx)
        // Silinen alana bağlı bir "showIf" varsa onu da temizle, aksi halde
        // artık var olmayan bir alana referans veren geçersiz bir koşul kalır.
        .map((f) => (f.showIf?.field === removedKey ? { ...f, showIf: undefined } : f))
    )
  }
  function moveField(idx: number, dir: -1 | 1) {
    const next = [...fields]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange(next)
  }
  function patchField(idx: number, patch: Partial<FormFieldSchema>) {
    onChange(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  }

  return (
    <div className="flex flex-col gap-2">
      {fields.map((field, idx) => (
        <div key={idx} className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <input
              value={field.label}
              onChange={(e) => {
                const label = e.target.value
                patchField(idx, { label, key: field.key || slugify(label) })
              }}
              placeholder={t({ tr: 'Alan etiketi (örn. Varlık Etiketi)', en: 'Field label (e.g. Asset Tag)' })}
              className="flex-1 text-[12px] bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1.5"
            />
            <select
              value={field.type}
              onChange={(e) => patchField(idx, { type: e.target.value as 'text' | 'select' })}
              className="text-[11.5px] font-semibold bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1.5"
            >
              <option value="text">{t({ tr: 'Serbest Metin', en: 'Free Text' })}</option>
              <option value="select">{t({ tr: 'Seçim Listesi', en: 'Select List' })}</option>
            </select>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => moveField(idx, -1)}
                disabled={idx === 0}
                title={t({ tr: 'Yukarı taşı', en: 'Move up' })}
                aria-label={t({ tr: 'Yukarı taşı', en: 'Move up' })}
                className="disabled:opacity-30 text-[var(--text-faint)]"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => moveField(idx, 1)}
                disabled={idx === fields.length - 1}
                title={t({ tr: 'Aşağı taşı', en: 'Move down' })}
                aria-label={t({ tr: 'Aşağı taşı', en: 'Move down' })}
                className="disabled:opacity-30 text-[var(--text-faint)]"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => removeField(idx)}
                title={t({ tr: 'Alanı sil', en: 'Delete field' })}
                aria-label={t({ tr: 'Alanı sil', en: 'Delete field' })}
                className="text-[var(--text-faint)] hover:text-p1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {field.type === 'select' && (
            <input
              value={field.options?.join(', ') ?? ''}
              onChange={(e) => patchField(idx, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              placeholder={t({ tr: 'Seçenekler, virgülle ayırın (örn. 8GB, 16GB, 32GB)', en: 'Options, comma-separated (e.g. 8GB, 16GB, 32GB)' })}
              className="w-full text-[11.5px] bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1.5"
            />
          )}
          {fields.length > 1 && (
            <ShowIfEditor
              field={field}
              otherFields={fields.filter((_, i) => i !== idx)}
              onChange={(showIf) => patchField(idx, { showIf })}
            />
          )}
        </div>
      ))}
      {!fields.length && (
        <p className="text-[11px] text-[var(--text-faint)] italic py-1">{t({ tr: 'Henüz özel alan eklenmedi.', en: 'No custom fields added yet.' })}</p>
      )}
      <button onClick={addField} className="flex items-center gap-1 text-[11px] font-bold text-brand-dim self-start">
        <Plus className="w-3.5 h-3.5" />
        {t({ tr: 'Alan Ekle', en: 'Add Field' })}
      </button>
    </div>
  )
}

// Bir alanın koşullu görünürlüğünü ("showIf") ayarlamak için editördeki
// her satırın altına eklenen küçük kontrol — hangi alana bağlı olduğunu
// ve o alanın hangi değerinde görüneceğini seçtirir.
function ShowIfEditor({
  field,
  otherFields,
  onChange,
}: {
  field: FormFieldSchema
  otherFields: FormFieldSchema[]
  onChange: (showIf: FormFieldSchema['showIf']) => void
}) {
  const { t } = useLang()
  const depField = otherFields.find((f) => f.key === field.showIf?.field)

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <select
        value={field.showIf?.field ?? ''}
        onChange={(e) => {
          const depKey = e.target.value
          if (!depKey) {
            onChange(undefined)
            return
          }
          const target = otherFields.find((f) => f.key === depKey)
          onChange({ field: depKey, equals: target?.options?.[0] ?? '' })
        }}
        className="text-[11px] bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1 text-[var(--text-faint)]"
      >
        <option value="">{t({ tr: 'Her zaman görünür', en: 'Always visible' })}</option>
        {otherFields.filter((f) => f.key).map((f) => (
          <option key={f.key} value={f.key}>
            {t({ tr: `Bağlı görünür — ${f.label || f.key}`, en: `Visible if — ${f.label || f.key}` })}
          </option>
        ))}
      </select>
      {field.showIf && (
        depField?.type === 'select' ? (
          <select
            value={field.showIf.equals}
            onChange={(e) => onChange({ field: field.showIf!.field, equals: e.target.value })}
            className="text-[11px] bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1"
          >
            {(depField.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={field.showIf.equals}
            onChange={(e) => onChange({ field: field.showIf!.field, equals: e.target.value })}
            placeholder={t({ tr: 'eşit olduğu değer', en: 'value it must equal' })}
            className="flex-1 text-[11px] bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1"
          />
        )
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// RENDERER — Bir form şemasını, koşullu görünürlüğe (showIf) uyarak
// gerçek input'lara çeviren paylaşılan bileşen.
// ------------------------------------------------------------------

/** Bir alanın showIf koşuluna göre şu an görünür olup olmadığını
 * belirler. DynamicFieldsRenderer'ın kendisi (render sırasında) VE
 * formu gönderen sayfalar (submit öncesi artık görünmeyen bir alanın
 * eski değerini temizlemek için — aksi halde kullanıcı görünürlüğü
 * değiştirdikten sonra alakasız bir değer sunucuya gider) tarafından
 * paylaşılır. */
export function isFieldVisible(field: FormFieldSchema, values: Record<string, string>): boolean {
  if (!field.showIf) return true
  return values[field.showIf.field] === field.showIf.equals
}

export function DynamicFieldsRenderer({
  fields,
  values,
  onChange,
}: {
  fields: FormFieldSchema[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  const { t } = useLang()

  function isVisible(field: FormFieldSchema): boolean {
    return isFieldVisible(field, values)
  }

  return (
    <>
      {fields.filter(isVisible).map((field) => (
        <div key={field.key}>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">{field.label}</label>
          {field.type === 'select' ? (
            <select
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
            >
              <option value="">{t({ tr: 'Seçin…', en: 'Select…' })}</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
            />
          )}
        </div>
      ))}
    </>
  )
}

function slugify(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
