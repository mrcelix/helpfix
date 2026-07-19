import { useEffect, useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { useArticleDetail, useIncrementView, useVoteArticle, useUpdateArticle, type DecisionTree } from './useKnowledgeBase'
import { DecisionTreeViewer } from './DecisionTreeViewer'
import { DecisionTreeEditor } from './DecisionTreeEditor'

export function ArticleDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useLang()
  const { profile } = useAuth()
  const { data: article, isLoading, error } = useArticleDetail(id)
  const incrementView = useIncrementView()
  const voteArticle = useVoteArticle(id)
  const updateArticle = useUpdateArticle(id)
  const [voted, setVoted] = useState(false)
  const [editingTree, setEditingTree] = useState(false)

  const canManage = profile && ['tenant_admin', 'manager', 'agent'].includes(profile.role)

  // Drawer açıldığında bir kez görüntülenme sayacını artır.
  useEffect(() => {
    incrementView.mutate(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <Drawer open onClose={onClose} title={article?.title ?? '…'} widthClass="w-[560px]">
      {error ? (
        <div className="text-p1 text-sm py-10 text-center">{t({ tr: 'Makale yüklenemedi.', en: 'Failed to load article.' })}</div>
      ) : isLoading || !article ? (
        <div className="text-[var(--text-faint)] text-sm py-10 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            {article.category && (
              <span className="text-[11px] text-[var(--text-faint)] bg-[var(--panel-2)] border border-[var(--border)] rounded-full px-2.5 py-0.5">
                {article.category}
              </span>
            )}
            <span className="text-[11px] text-[var(--text-faint)]">
              {article.view_count} {t({ tr: 'görüntülenme', en: 'views' })} · {article.author?.full_name}
            </span>
            {canManage && (
              <select
                value={article.status}
                onChange={(e) => updateArticle.mutate({ status: e.target.value as 'draft' | 'published' | 'archived' })}
                aria-label={t({ tr: 'Makale durumu', en: 'Article status' })}
                className="ml-auto bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2 py-1 text-[11px]"
              >
                <option value="draft">{t({ tr: 'Taslak', en: 'Draft' })}</option>
                <option value="published">{t({ tr: 'Yayınlandı', en: 'Published' })}</option>
                <option value="archived">{t({ tr: 'Arşivlendi', en: 'Archived' })}</option>
              </select>
            )}
          </div>

          <div className="text-[13px] text-[var(--text-sub)] leading-relaxed whitespace-pre-wrap">{article.content}</div>

          {editingTree ? (
            <DecisionTreeEditor
              initialTree={article.decision_tree}
              onCancel={() => setEditingTree(false)}
              onSave={(tree: DecisionTree) => {
                updateArticle.mutate({ decision_tree: tree })
                setEditingTree(false)
              }}
            />
          ) : article.decision_tree ? (
            <div>
              <DecisionTreeViewer tree={article.decision_tree} />
              {canManage && (
                <button onClick={() => setEditingTree(true)} className="text-[11px] font-semibold text-brand-dim mt-2">
                  {t({ tr: 'Karar Ağacını Düzenle', en: 'Edit Decision Tree' })}
                </button>
              )}
            </div>
          ) : (
            canManage && (
              <button
                onClick={() => setEditingTree(true)}
                className="w-full py-2.5 rounded-lg border border-dashed border-[var(--border)] text-[12px] font-semibold text-[var(--text-faint)]"
              >
                🧭 {t({ tr: 'Rehberli Karar Ağacı Ekle', en: 'Add Guided Decision Tree' })}
              </button>
            )
          )}

          <div className="border-t border-[var(--border)] pt-4">
            {voted ? (
              <p className="text-[12px] text-[var(--text-faint)] text-center">
                {t({ tr: 'Geri bildiriminiz için teşekkürler!', en: 'Thanks for your feedback!' })}
              </p>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <span className="text-[12px] text-[var(--text-faint)]">{t({ tr: 'Bu makale faydalı oldu mu?', en: 'Was this article helpful?' })}</span>
                <button
                  onClick={() => voteArticle.mutate(true, { onSuccess: () => setVoted(true) })}
                  title={t({ tr: 'Faydalı', en: 'Helpful' })}
                  aria-label={t({ tr: 'Faydalı', en: 'Helpful' })}
                  className="w-8 h-8 rounded-lg bg-[var(--panel-2)] border border-[var(--border)] flex items-center justify-center hover:border-ok hover:text-ok"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => voteArticle.mutate(false, { onSuccess: () => setVoted(true) })}
                  title={t({ tr: 'Faydalı değil', en: 'Not helpful' })}
                  aria-label={t({ tr: 'Faydalı değil', en: 'Not helpful' })}
                  className="w-8 h-8 rounded-lg bg-[var(--panel-2)] border border-[var(--border)] flex items-center justify-center hover:border-p1 hover:text-p1"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            )}
            {voteArticle.isError && (
              <p className="text-[11px] text-p1 text-center mt-2">{t({ tr: 'Oy kaydedilemedi, tekrar deneyin.', en: 'Vote failed, please try again.' })}</p>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}
