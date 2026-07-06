import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ArticleStatus } from '@/types/database'

export interface ArticleListItem {
  id: string
  title: string
  slug: string
  category: string | null
  status: ArticleStatus
  view_count: number
  helpful_count: number
  unhelpful_count: number
  updated_at: string
  author: { full_name: string } | null
}

export interface DecisionTreeOption {
  label: string
  next: string | null
}
export interface DecisionTreeNode {
  text: string
  options: DecisionTreeOption[]
}
export interface DecisionTree {
  startNode: string
  nodes: Record<string, DecisionTreeNode>
}

export interface ArticleDetail extends ArticleListItem {
  content: string
  published_at: string | null
  decision_tree: DecisionTree | null
}

export type KbSavedView = 'published' | 'drafts' | 'most_viewed' | 'needs_review'

const SELECT_LIST = `
  id, title, slug, category, status, view_count, helpful_count, unhelpful_count, updated_at,
  author:author_id ( full_name )
`

export function useArticles(view: KbSavedView, search: string) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['kb-articles', view, search, profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase.from('knowledge_articles').select(SELECT_LIST)

      if (view === 'published') {
        query = query.eq('status', 'published').order('view_count', { ascending: false })
      } else if (view === 'drafts') {
        query = query.eq('status', 'draft').order('updated_at', { ascending: false })
      } else if (view === 'most_viewed') {
        query = query.eq('status', 'published').order('view_count', { ascending: false }).limit(10)
      } else if (view === 'needs_review') {
        // Faydasız oyu faydalı oyundan fazla olan makaleler — gözden
        // geçirme ihtiyacı olan içeriği yüzeye çıkarır.
        query = query.eq('status', 'published').order('unhelpful_count', { ascending: false })
      }

      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as ArticleListItem[]
    },
  })
}

export function useArticleDetail(id: string | null) {
  return useQuery({
    queryKey: ['kb-article', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_articles')
        .select(`${SELECT_LIST}, content, published_at, decision_tree`)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as ArticleDetail
    },
  })
}

export function useIncrementView() {
  return useMutation({
    mutationFn: async (articleId: string) => {
      const { error } = await supabase.rpc('increment_article_view', { p_article_id: articleId })
      if (error) throw error
    },
  })
}

export function useVoteArticle(articleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (helpful: boolean) => {
      const { error } = await supabase.rpc('vote_article', { p_article_id: articleId, p_helpful: helpful })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kb-article', articleId] })
      qc.invalidateQueries({ queryKey: ['kb-articles'] })
    },
  })
}

export function useCreateArticle() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (input: { title: string; content: string; category: string | null; status: ArticleStatus }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { data, error } = await supabase
        .from('knowledge_articles')
        .insert({
          tenant_id: profile.tenantId,
          title: input.title,
          content: input.content,
          category: input.category,
          status: input.status,
          author_id: profile.id,
          published_at: null,
          decision_tree: null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb-articles'] }),
  })
}

export function useUpdateArticle(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<{ title: string; content: string; category: string | null; status: ArticleStatus; decision_tree: DecisionTree | null }>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('knowledge_articles').update(patch as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kb-articles'] })
      qc.invalidateQueries({ queryKey: ['kb-article', id] })
    },
  })
}

// ------------------------------------------------------------------
// BİLGİ BOŞLUĞU ANALİZİ — sonuçsuz aramaları loglar ve raporlar
// ------------------------------------------------------------------
export function useLogSearch() {
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { query: string; resultCount: number }) => {
      if (!profile || input.query.trim().length < 3) return
      const { error } = await supabase.from('kb_search_log').insert({
        tenant_id: profile.tenantId,
        query: input.query.trim(),
        result_count: input.resultCount,
        searched_by: profile.id,
      })
      if (error) throw error
    },
  })
}

export interface KbGap {
  query: string
  search_count: number
  last_searched: string
}

export function useKbGapAnalysis() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['kb-gap-analysis', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_kb_gap_analysis', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as KbGap[]
    },
  })
}
