import { useState } from 'react'
import { useLang, pickLang} from '@/contexts/LangContext'
import { FieldSchemaEditor, type FormFieldSchema } from '@/components/ui/DynamicFields'
import { useAllTicketCategoryFields, useSetTicketCategoryFields } from '@/pages/service-desk/useIncidents'
import { TICKET_CATEGORIES } from '@/pages/service-desk/ticket-categories'

export function TicketFieldsTab() {
  const { lang, t } = useLang()
  const { data: allFields, isLoading, error } = useAllTicketCategoryFields()
  const setFields = useSetTicketCategoryFields()
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const fieldsByCategory = new Map((allFields ?? []).map((r) => [r.category_key, (r.field_schema as FormFieldSchema[]) ?? []]))

  return (
    <div className="max-w-2xl">
      <p className="text-[12px] text-[var(--text-faint)] mb-4">
        {t({
          tr: 'Yeni Talep sihirbazında her kategori seçildiğinde, standart Konu/Açıklama alanlarına ek olarak burada tanımladığınız özel alanlar gösterilir (örn. Donanım kategorisinde "Varlık Etiketi" alanı).',
          en: 'When a category is selected in the New Ticket wizard, the custom fields defined here are shown in addition to the standard Subject/Description fields (e.g. an "Asset Tag" field for the Hardware category).',
        })}
      </p>
      {isLoading && <p className="text-[12px] text-[var(--text-faint)] py-4 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}
      {error && <p className="text-[12px] text-p1 py-4 text-center">{t({ tr: 'Alan tanımları yüklenemedi.', en: 'Failed to load field definitions.' })}</p>}
      {!isLoading && !error && (
      <div className="flex flex-col gap-2">
        {TICKET_CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const fields = fieldsByCategory.get(cat.key) ?? []
          const isOpen = expandedKey === cat.key
          return (
            <div key={cat.key} className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] overflow-hidden">
              <button
                onClick={() => setExpandedKey(isOpen ? null : cat.key)}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-[var(--row-hover)]"
              >
                <Icon className="w-4 h-4 text-brand-dim shrink-0" />
                <span className="font-semibold text-[13px] flex-1">{pickLang(cat.label, lang)}</span>
                <span className="text-[11px] text-[var(--text-faint)]">
                  {fields.length ? t({ tr: `${fields.length} alan`, en: `${fields.length} fields` }) : t({ tr: 'Alan yok', en: 'No fields' })}
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-[var(--border)] pt-3">
                  <CategoryFieldsEditor
                    initialFields={fields}
                    onSave={(f) => setFields.mutate({ categoryKey: cat.key, fields: f })}
                    isPending={setFields.isPending}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

function CategoryFieldsEditor({
  initialFields,
  onSave,
  isPending,
}: {
  initialFields: FormFieldSchema[]
  onSave: (fields: FormFieldSchema[]) => void
  isPending: boolean
}) {
  const { t } = useLang()
  const [fields, setFields] = useState<FormFieldSchema[]>(initialFields)

  return (
    <div>
      <FieldSchemaEditor fields={fields} onChange={setFields} />
      <button
        onClick={() => onSave(fields)}
        disabled={isPending}
        className="mt-3 text-[11px] font-bold px-3 py-1.5 rounded-md bg-brand text-white disabled:opacity-40"
      >
        {isPending ? t({ tr: 'Kaydediliyor…', en: 'Saving…' }) : t({ tr: 'Kaydet', en: 'Save' })}
      </button>
    </div>
  )
}
