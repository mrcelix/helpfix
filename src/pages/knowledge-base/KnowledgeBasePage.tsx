import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { useArticles, type KbSavedView } from './useKnowledgeBase'
import { ArticleDrawer } from './ArticleDrawer'
import { NewArticleModal } from './NewArticleModal'

const SAVED_VIEWS: { key: KbSavedView; label: { tr: string; en: string } }[] = [
  { key: 'published', label: { tr: 'Yayınlanan', en: 'Published' } },
  { key: 'drafts', label: { tr: 'Taslaklar', en: 'Drafts' } },
  { key: 'most_viewed', label: { tr: 'En Çok Görüntülenen', en: 'Most Viewed' } },
  { key: 'needs_review', label: { tr: 'Gözden Geçirilmeli', en: 'Needs Review' } },
]

export function KnowledgeBasePage() {
  const { lang, t } = useLang()
  const [view, setView] = useState<KbSavedView>('published')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)

  const { data: articles, isLoading, error } = useArticles(view, search)

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {t({ tr: 'Bilgi Yönetimi', en: 'Knowledge Base' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Makaleler, arama ve faydalılık geri bildirimi', en: 'Articles, search, and helpfulness feedback' })}
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="w-[15px] h-[15px]" />
          {t({ tr: 'Yeni Makale', en: 'New Article' })}
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-2 mb-4 max-w-md">
        <Search className="w-[15px] h-[15px] text-[var(--text-faint)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t({ tr: 'Makale ara…', en: 'Search articles…' })}
          className="bg-transparent outline-none text-[13px] w-full"
        />
      </div>

      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {SAVED_VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={
              'text-[12.5px] font-bold px-3.5 py-2 rounded-lg border transition-colors ' +
              (view === v.key
                ? 'bg-brand border-brand text-white'
                : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]')
            }
          >
            {v.label[lang]}
          </button>
        ))}
      </div>

      <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-hidden bg-[var(--panel)]">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
              <Th>{t({ tr: 'Başlık', en: 'Title' })}</Th>
              <Th>{t({ tr: 'Kategori', en: 'Category' })}</Th>
              <Th>{t({ tr: 'Yazar', en: 'Author' })}</Th>
              <Th>{t({ tr: 'Görüntülenme', en: 'Views' })}</Th>
              <Th>{t({ tr: 'Faydalı', en: 'Helpful' })}</Th>
              <Th>{t({ tr: 'Güncelleme', en: 'Updated' })}</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[var(--text-faint)]">
                  {t({ tr: 'Yükleniyor…', en: 'Loading…' })}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-p1">
                  {t({ tr: 'Bir hata oluştu.', en: 'Something went wrong.' })}
                </td>
              </tr>
            )}
            {!isLoading && !error && articles?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-14 text-[var(--text-faint)]">
                  {t({ tr: 'Bu görünümde makale yok.', en: 'No articles in this view.' })}
                </td>
              </tr>
            )}
            {articles?.map((a) => (
              <tr
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--row-hover)] cursor-pointer"
              >
                <td className="px-3.5 py-3 font-semibold">{a.title}</td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{a.category ?? '—'}</td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{a.author?.full_name ?? '—'}</td>
                <td className="px-3.5 py-3 text-[var(--text-faint)]">{a.view_count}</td>
                <td className="px-3.5 py-3">
                  <span className="text-ok font-semibold">{a.helpful_count}</span>
                  <span className="text-[var(--text-faint)]"> / </span>
                  <span className="text-p1 font-semibold">{a.unhelpful_count}</span>
                </td>
                <td className="px-3.5 py-3 text-[var(--text-faint)]">
                  {new Date(a.updated_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId && <ArticleDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
      {showNewModal && <NewArticleModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">
      {children}
    </th>
  )
}
