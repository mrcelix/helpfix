import { useState, type FormEvent } from 'react'
import { Sparkles, Loader2, ChevronLeft, Check, Pencil, Search } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { useLang } from '@/contexts/LangContext'
import { useCreateIncident, useDistinctCategories } from './useIncidents'
import { useSuggestTriage, type TriageSuggestion } from './useAiAssist'
import { TICKET_CATEGORIES, resolveCategoryLabel, type TicketCategory, type TicketSubcategory } from './ticket-categories'
import { priorityLabel } from '@/lib/priority'
import type { Priority } from '@/types/database'

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4']
type Step = 'category' | 'subcategory' | 'details'

export function NewTicketModal({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLang()
  const createIncident = useCreateIncident()
  const { data: existingCategories } = useDistinctCategories()
  const suggestTriage = useSuggestTriage()

  const [step, setStep] = useState<Step>('category')
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<TicketSubcategory | null>(null)
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null)
  const [categorySearch, setCategorySearch] = useState('')

  const categoryMatches =
    categorySearch.trim().length > 0
      ? TICKET_CATEGORIES.flatMap((cat) => {
          const q = categorySearch.trim().toLocaleLowerCase(lang === 'tr' ? 'tr-TR' : 'en-US')
          const catLabel = cat.label[lang].toLocaleLowerCase(lang === 'tr' ? 'tr-TR' : 'en-US')
          const matches: { category: TicketCategory; subcategory: TicketSubcategory | null }[] = []
          if (catLabel.includes(q) && cat.subcategories.length === 0) matches.push({ category: cat, subcategory: null })
          cat.subcategories.forEach((sub) => {
            const subLabel = sub.label[lang].toLocaleLowerCase(lang === 'tr' ? 'tr-TR' : 'en-US')
            if (catLabel.includes(q) || subLabel.includes(q)) matches.push({ category: cat, subcategory: sub })
          })
          return matches
        })
      : []

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('P3')
  const [suggestion, setSuggestion] = useState<TriageSuggestion | null>(null)

  const finalCategory =
    categoryOverride ?? (selectedCategory ? resolveCategoryLabel(selectedCategory, selectedSubcategory, lang) : '')

  function pickCategory(cat: TicketCategory) {
    setSelectedCategory(cat)
    setSelectedSubcategory(null)
    setCategoryOverride(null)
    setStep(cat.subcategories.length ? 'subcategory' : 'details')
  }

  function pickSubcategory(sub: TicketSubcategory | null) {
    setSelectedSubcategory(sub)
    setCategoryOverride(null)
    setStep('details')
  }

  function selectMatch(cat: TicketCategory, sub: TicketSubcategory | null) {
    setSelectedCategory(cat)
    setSelectedSubcategory(sub)
    setCategoryOverride(null)
    setCategorySearch('')
    setStep('details')
  }

  function goBack() {
    if (step === 'details') {
      setStep(selectedCategory && selectedCategory.subcategories.length ? 'subcategory' : 'category')
    } else if (step === 'subcategory') {
      setStep('category')
    }
  }

  async function handleSuggest() {
    if (!title.trim()) return
    setSuggestion(null)
    try {
      const result = await suggestTriage.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        existingCategories,
      })
      setCategoryOverride(result.category)
      setPriority(result.priority)
      setSuggestion(result)
    } catch {
      // Sessizce yut — AI önerisi başarısız olursa kullanıcı zaten
      // sihirbazdan seçtiği kategoriyle devam edebilir.
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || step !== 'details') return
    await createIncident.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      priority,
      category: finalCategory.trim() || null,
    })
    onClose()
  }

  const stepIndex = step === 'category' ? 1 : step === 'subcategory' ? 2 : 3
  const stepLabel =
    step === 'category'
      ? t({ tr: 'Kategori seçin', en: 'Choose a category' })
      : step === 'subcategory'
        ? t({ tr: 'Alt kategori seçin', en: 'Choose a subcategory' })
        : t({ tr: 'Talep detayları', en: 'Ticket details' })

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Talep', en: 'New Ticket' })}
      widthClass="max-w-[560px]"
      footer={
        step === 'details' ? (
          <>
            <Button variant="ghost" onClick={goBack}>
              <ChevronLeft className="w-[15px] h-[15px]" />
              {t({ tr: 'Geri', en: 'Back' })}
            </Button>
            <Button onClick={handleSubmit} disabled={createIncident.isPending || !title.trim()}>
              {createIncident.isPending
                ? t({ tr: 'Gönderiliyor…', en: 'Submitting…' })
                : t({ tr: 'Talebi Oluştur', en: 'Create Ticket' })}
            </Button>
          </>
        ) : step === 'subcategory' ? (
          <Button variant="ghost" onClick={goBack}>
            <ChevronLeft className="w-[15px] h-[15px]" />
            {t({ tr: 'Geri', en: 'Back' })}
          </Button>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
        )
      }
    >
      {/* Adım göstergesi */}
      <div className="flex items-center gap-2 mb-5">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= stepIndex ? 'bg-brand' : 'bg-[var(--panel-2)] border border-[var(--border)]'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide">
          {t({ tr: `Adım ${stepIndex}/3`, en: `Step ${stepIndex}/3` })}
        </span>
        <span className="text-[12.5px] font-semibold">{stepLabel}</span>
      </div>

      {/* ADIM 1 — KATEGORİ */}
      {step === 'category' && (
        <div>
          <div className="flex items-center gap-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 mb-4">
            <Search className="w-[15px] h-[15px] text-[var(--text-faint)] shrink-0" />
            <input
              autoFocus
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder={t({ tr: 'Kategori ara… (örn. VPN, yazıcı, şifre)', en: 'Search category… (e.g. VPN, printer, password)' })}
              className="flex-1 bg-transparent outline-none text-[13px]"
            />
            <VoiceInputButton onResult={(text) => setCategorySearch(text)} />
          </div>

          {categorySearch.trim().length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {categoryMatches.length === 0 && (
                <p className="text-[12px] text-[var(--text-faint)] italic text-center py-6">
                  {t({ tr: 'Eşleşen kategori bulunamadı.', en: 'No matching category found.' })}
                </p>
              )}
              {categoryMatches.map(({ category, subcategory }) => {
                const Icon = category.icon
                return (
                  <button
                    key={`${category.key}-${subcategory?.key ?? 'none'}`}
                    type="button"
                    onClick={() => selectMatch(category, subcategory)}
                    className="flex items-center gap-2.5 text-left px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] hover:border-brand hover:bg-brand-tint transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-brand-dim" />
                    </div>
                    <span className="text-[13px] font-medium">
                      {category.label[lang]}
                      {subcategory && <span className="text-[var(--text-faint)]"> — {subcategory.label[lang]}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {TICKET_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => pickCategory(cat)}
                    className="flex flex-col items-center gap-2 text-center px-3 py-4 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] hover:border-brand hover:bg-brand-tint transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center">
                      <Icon className="w-[18px] h-[18px] text-brand-dim" />
                    </div>
                    <span className="text-[12px] font-semibold leading-tight">{cat.label[lang]}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ADIM 2 — ALT KATEGORİ */}
      {step === 'subcategory' && selectedCategory && (
        <div>
          <div className="flex items-center gap-2 mb-3.5 text-[12.5px] text-[var(--text-faint)]">
            <selectedCategory.icon className="w-4 h-4 text-brand-dim" />
            <span className="font-semibold text-[var(--text-sub)]">{selectedCategory.label[lang]}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {selectedCategory.subcategories.map((sub) => (
              <button
                key={sub.key}
                type="button"
                onClick={() => pickSubcategory(sub)}
                className="flex items-center justify-between text-left px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] hover:border-brand hover:bg-brand-tint transition-colors text-[13px] font-medium"
              >
                {sub.label[lang]}
                <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[var(--text-faint)]" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => pickSubcategory(null)}
              className="text-[11.5px] font-semibold text-[var(--text-faint)] mt-1.5 self-start hover:text-brand-dim"
            >
              {t({ tr: 'Alt kategori belirtmeden devam et', en: 'Continue without a subcategory' })}
            </button>
          </div>
        </div>
      )}

      {/* ADIM 3 — DETAYLAR */}
      {step === 'details' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2">
            <span className="text-[12px] text-[var(--text-sub)]">
              <span className="text-[var(--text-faint)]">{t({ tr: 'Kategori: ', en: 'Category: ' })}</span>
              <span className="font-semibold">{finalCategory || t({ tr: 'Belirtilmedi', en: 'Not set' })}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setCategorySearch('')
                setStep('category')
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-brand-dim"
            >
              <Pencil className="w-3 h-3" />
              {t({ tr: 'Değiştir', en: 'Change' })}
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Konu', en: 'Subject' })}
            </label>
            <div className="flex items-center gap-1.5 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 focus-within:border-brand">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t({ tr: 'Kısaca sorunu özetleyin…', en: 'Briefly summarize the issue…' })}
                className="flex-1 bg-transparent py-2.5 text-[13px] outline-none"
              />
              <VoiceInputButton onResult={(text) => setTitle((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text))} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Açıklama', en: 'Description' })}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={t({ tr: 'Detaylandırın…', en: 'Add detail…' })}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand resize-none"
            />
          </div>

          <div className="flex items-center justify-between -mt-1">
            <button
              type="button"
              onClick={handleSuggest}
              disabled={!title.trim() || suggestTriage.isPending}
              className="flex items-center gap-1.5 text-[11.5px] font-bold text-brand-dim disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {suggestTriage.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {t({ tr: 'AI ile Kategori & Öncelik Öner', en: 'Suggest Category & Priority with AI' })}
            </button>
          </div>
          {suggestion && (
            <div className="flex items-start gap-2 bg-brand-tint border border-brand/30 rounded-lg px-3 py-2.5 text-[12px] text-[var(--text-sub)]">
              <Sparkles className="w-3.5 h-3.5 text-brand-dim shrink-0 mt-0.5" />
              <span>
                <Check className="w-3 h-3 inline mb-0.5 mr-0.5 text-ok" />
                {suggestion.reasoning}
              </span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Öncelik', en: 'Priority' })}
            </label>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={
                    'flex-1 text-[11.5px] font-bold py-2 rounded-lg border transition-colors ' +
                    (priority === p
                      ? 'bg-p2 border-p2 text-black/80'
                      : 'bg-[var(--panel-2)] border-[var(--border)] text-[var(--text-sub)]')
                  }
                >
                  {priorityLabel(p, lang)}
                </button>
              ))}
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
