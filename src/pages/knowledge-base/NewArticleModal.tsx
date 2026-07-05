import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateArticle } from './useKnowledgeBase'
import type { ArticleStatus } from '@/types/database'

export function NewArticleModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const createArticle = useCreateArticle()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')

  async function handleSubmit(status: ArticleStatus) {
    if (!title.trim() || !content.trim()) return
    await createArticle.mutateAsync({ title: title.trim(), content: content.trim(), category: category.trim() || null, status })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Makale', en: 'New Article' })}
      widthClass="max-w-[620px]"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button variant="ghost" onClick={() => handleSubmit('draft')} disabled={createArticle.isPending}>
            {t({ tr: 'Taslak Kaydet', en: 'Save Draft' })}
          </Button>
          <Button onClick={() => handleSubmit('published')} disabled={createArticle.isPending || !title.trim() || !content.trim()}>
            {t({ tr: 'Yayınla', en: 'Publish' })}
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Başlık', en: 'Title' })}
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand"
          />
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
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'İçerik', en: 'Content' })}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand resize-none"
          />
        </div>
      </form>
    </Modal>
  )
}
