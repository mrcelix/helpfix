import { useState, type FormEvent } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateIncident, useDistinctCategories } from './useIncidents'
import { useSuggestTriage, type TriageSuggestion } from './useAiAssist'
import type { Priority } from '@/types/database'

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4']

export function NewTicketModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const createIncident = useCreateIncident()
  const { data: existingCategories } = useDistinctCategories()
  const suggestTriage = useSuggestTriage()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('P3')
  const [category, setCategory] = useState('')
  const [suggestion, setSuggestion] = useState<TriageSuggestion | null>(null)

  async function handleSuggest() {
    if (!title.trim()) return
    setSuggestion(null)
    try {
      const result = await suggestTriage.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        existingCategories,
      })
      setCategory(result.category)
      setPriority(result.priority)
      setSuggestion(result)
    } catch {
      // Sessizce yut — AI önerisi başarısız olursa kullanıcı zaten
      // formu elle doldurabilir, akışı bloklamaya gerek yok.
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await createIncident.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      priority,
      category: category.trim() || null,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Talep', en: 'New Ticket' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createIncident.isPending || !title.trim()}>
            {createIncident.isPending
              ? t({ tr: 'Gönderiliyor…', en: 'Submitting…' })
              : t({ tr: 'Talebi Oluştur', en: 'Create Ticket' })}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Konu', en: 'Subject' })}
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t({ tr: 'Kısaca sorunu özetleyin…', en: 'Briefly summarize the issue…' })}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand"
          />
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
            <span>{suggestion.reasoning}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
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
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Kategori', en: 'Category' })}
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t({ tr: 'örn. Ağ & VPN', en: 'e.g. Network & VPN' })}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
