import { useState, useEffect, useRef } from 'react'
import { useOpenParam } from '@/hooks/useOpenParam'
import { Plus, Search } from 'lucide-react'
import { useLang, pickLang} from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { useArticles, useLogSearch, useKbGapAnalysis, type KbSavedView } from './useKnowledgeBase'
import { ArticleDrawer } from './ArticleDrawer'
import { NewArticleModal } from './NewArticleModal'

const SAVED_VIEWS: { key: KbSavedView; label: { tr: string; en: string; fr?: string; it?: string; ar?: string }; managerOnly?: boolean }[] = [
  { key: 'published', label: { tr: 'Yayınlanan', en: 'Published', fr: 'Publié', it: 'Pubblicato', ar: 'المنشورة' } },
  { key: 'drafts', label: { tr: 'Taslaklar', en: 'Drafts', fr: 'Brouillons', it: 'Bozze', ar: 'المسودات' }, managerOnly: true },
  { key: 'most_viewed', label: { tr: 'En Çok Görüntülenen', en: 'Most Viewed', fr: 'Les plus consultés', it: 'Più visualizzati', ar: 'الأكثر مشاهدة' } },
  { key: 'needs_review', label: { tr: 'Gözden Geçirilmeli', en: 'Needs Review', fr: 'À revoir', it: 'Da rivedere', ar: 'بحاجة إلى مراجعة' }, managerOnly: true },
  { key: 'archived', label: { tr: 'Arşivlenmiş', en: 'Archived', fr: 'Archivé', it: 'Archiviato', ar: 'مؤرشف' }, managerOnly: true },
]

const STATUS_LABEL: Record<string, { tr: string; en: string }> = {
  draft: { tr: 'Taslak', en: 'Draft' },
  published: { tr: 'Yayınlandı', en: 'Published' },
  archived: { tr: 'Arşivlendi', en: 'Archived' },
}
const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-[var(--panel-2)] border-[var(--border)] text-[var(--text-faint)]',
  published: 'bg-ok/15 border-ok/30 text-ok',
  archived: 'bg-[var(--panel-2)] border-[var(--border)] text-[var(--text-faint)]',
}

export function KnowledgeBasePage() {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const canManage = profile && ['tenant_admin', 'manager', 'agent'].includes(profile.role)
  const [view, setView] = useState<KbSavedView>('published')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const openId = useOpenParam()
  useEffect(() => { if (openId) setSelectedId(openId) }, [openId])
  const [showNewModal, setShowNewModal] = useState(false)

  const { data: articles, isLoading, error } = useArticles(view, search)
  const logSearch = useLogSearch()
  const { data: gaps, error: gapsError } = useKbGapAnalysis()

  // articles her render'da güncellenir; ref ile en güncel sonuç sayısına
  // erişerek debounce timeout'unun eski (stale) bir kapanışı loglamasını önler.
  const articlesRef = useRef(articles)
  articlesRef.current = articles

  // Sonuçsuz (veya sonuçlu) her aramayı debounce ile logla — Bilgi
  // Boşluğu Analizi'nin veri kaynağı.
  useEffect(() => {
    if (search.trim().length < 3) return
    const timeout = setTimeout(() => {
      logSearch.mutate({ query: search, resultCount: articlesRef.current?.length ?? 0 })
    }, 1200)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {t({ tr: 'Bilgi Yönetimi', en: 'Knowledge Base', fr: 'Base de connaissances', it: 'Base di conoscenza', ar: 'قاعدة المعرفة' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Makaleler, arama ve faydalılık geri bildirimi', en: 'Articles, search, and helpfulness feedback', fr: "Articles, recherche et retours d'utilité", it: "Articoli, ricerca e feedback sull'utilità", ar: 'المقالات والبحث وتقييمات الفائدة' })}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="w-[15px] h-[15px]" />
            {t({ tr: 'Yeni Makale', en: 'New Article', fr: 'Nouvel article', it: 'Nuovo articolo', ar: 'مقالة جديدة' })}
          </Button>
        )}
      </div>

      {canManage && gapsError && (
        <div className="text-[11.5px] text-p1 mb-3">
          {t({ tr: 'Bilgi boşluğu analizi yüklenemedi.', en: 'Failed to load knowledge gap analysis.' })}
        </div>
      )}

      {canManage && !!gaps?.length && (
        <div className="bg-p2-tint border border-p2/40 rounded-xl p-3.5 mb-4">
          <div className="text-[11px] font-bold text-p2 uppercase mb-1.5">
            🔍 {t({ tr: 'Bilgi Boşluğu Analizi — Sonuçsuz Aramalar', en: 'Knowledge Gap Analysis — Searches with No Results', fr: 'Analyse des lacunes de connaissances — Recherches sans résultat', it: 'Analisi delle lacune di conoscenza — Ricerche senza risultati', ar: 'تحليل الفجوة المعرفية — عمليات بحث بلا نتائج' })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {gaps.slice(0, 8).map((g) => (
              <span key={g.query} className="text-[11px] font-semibold bg-[var(--panel)] border border-[var(--border)] rounded-full px-2.5 py-1">
                "{g.query}" <span className="text-[var(--text-faint)]">×{g.search_count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-2 mb-4 max-w-md">
        <Search className="w-[15px] h-[15px] text-[var(--text-faint)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t({ tr: 'Makale ara…', en: 'Search articles…', fr: 'Rechercher des articles…', it: 'Cerca articoli…', ar: 'ابحث في المقالات…' })}
          className="bg-transparent outline-none text-[13px] w-full"
        />
        <VoiceInputButton onResult={(text) => setSearch(text)} />
      </div>

      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {SAVED_VIEWS.filter((v) => !v.managerOnly || canManage).map((v) => (
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
            {pickLang(v.label, lang)}
          </button>
        ))}
      </div>

      <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-x-auto bg-[var(--panel)]">
        <table className="w-full text-[12.5px] min-w-[720px]">
          <thead>
            <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
              <Th>{t({ tr: 'Başlık', en: 'Title', fr: 'Titre', it: 'Titolo', ar: 'العنوان' })}</Th>
              <Th>{t({ tr: 'Durum', en: 'Status', fr: 'Statut', it: 'Stato', ar: 'الحالة' })}</Th>
              <Th>{t({ tr: 'Kategori', en: 'Category', fr: 'Catégorie', it: 'Categoria', ar: 'الفئة' })}</Th>
              <Th>{t({ tr: 'Yazar', en: 'Author', fr: 'Auteur', it: 'Autore', ar: 'الكاتب' })}</Th>
              <Th>{t({ tr: 'Görüntülenme', en: 'Views', fr: 'Vues', it: 'Visualizzazioni', ar: 'المشاهدات' })}</Th>
              <Th>{t({ tr: 'Faydalı', en: 'Helpful', fr: 'Utile', it: 'Utile', ar: 'مفيد' })}</Th>
              <Th>{t({ tr: 'Güncelleme', en: 'Updated', fr: 'Mis à jour', it: 'Aggiornato', ar: 'تم التحديث' })}</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-[var(--text-faint)]">
                  {t({ tr: 'Yükleniyor…', en: 'Loading…', fr: 'Chargement…', it: 'Caricamento…', ar: 'جارٍ التحميل…' })}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-p1">
                  {t({ tr: 'Bir hata oluştu.', en: 'Something went wrong.', fr: "Une erreur s'est produite.", it: 'Si è verificato un errore.', ar: 'حدث خطأ ما.' })}
                </td>
              </tr>
            )}
            {!isLoading && !error && articles?.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-14 text-[var(--text-faint)]">
                  {t({ tr: 'Bu görünümde makale yok.', en: 'No articles in this view.', fr: 'Aucun article dans cette vue.', it: 'Nessun articolo in questa vista.', ar: 'لا توجد مقالات في هذا العرض.' })}
                </td>
              </tr>
            )}
            {articles?.map((a) => (
              <tr
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedId(a.id)
                  }
                }}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--row-hover)] cursor-pointer"
              >
                <td className="px-3.5 py-3 font-semibold">{a.title}</td>
                <td className="px-3.5 py-3">
                  <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${STATUS_STYLE[a.status]}`}>
                    {pickLang(STATUS_LABEL[a.status], lang)}
                  </span>
                </td>
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

      {selectedId && <ArticleDrawer key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} />}
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
