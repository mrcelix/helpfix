import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface SearchResult {
  id: string
  type: 'incident' | 'problem' | 'change' | 'article' | 'catalog_item' | 'ci'
  ref: string | null
  title: string
  path: string
}

/** Tüm ana modüllerde tek seferde arama yapar — Komut Paleti'nin
 * (⌘K) veri kaynağı. Her tablo ayrı sorgulanır (Supabase'de tek
 * sorguda çoklu tablo arama desteklenmiyor). */
export function useGlobalSearch(query: string) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['global-search', query, profile?.tenantId],
    enabled: !!profile && query.trim().length >= 2,
    queryFn: async () => {
      const q = `%${query.trim()}%`
      const [incidents, problems, changes, articles, catalogItems, cis] = await Promise.all([
        supabase.from('incidents').select('id, ref, title').ilike('title', q).limit(5),
        supabase.from('problems').select('id, ref, title').ilike('title', q).limit(5),
        supabase.from('changes').select('id, ref, title').ilike('title', q).limit(5),
        supabase.from('knowledge_articles').select('id, title').eq('status', 'published').ilike('title', q).limit(5),
        supabase.from('service_catalog_items').select('id, name').eq('is_active', true).ilike('name', q).limit(5),
        supabase.from('configuration_items').select('id, tag, name').ilike('name', q).limit(5),
      ])

      const results: SearchResult[] = [
        ...(incidents.data ?? []).map((r) => ({ id: r.id, type: 'incident' as const, ref: r.ref, title: r.title, path: `/service-desk?open=${r.id}` })),
        ...(problems.data ?? []).map((r) => ({ id: r.id, type: 'problem' as const, ref: r.ref, title: r.title, path: `/problems?open=${r.id}` })),
        ...(changes.data ?? []).map((r) => ({ id: r.id, type: 'change' as const, ref: r.ref, title: r.title, path: `/changes?open=${r.id}` })),
        ...(articles.data ?? []).map((r) => ({ id: r.id, type: 'article' as const, ref: null, title: r.title, path: `/knowledge-base?open=${r.id}` })),
        ...(catalogItems.data ?? []).map((r) => ({ id: r.id, type: 'catalog_item' as const, ref: null, title: r.name, path: `/catalog?open=${r.id}` })),
        ...(cis.data ?? []).map((r) => ({ id: r.id, type: 'ci' as const, ref: r.tag, title: r.name, path: `/cmdb?open=${r.id}` })),
      ]
      return results
    },
  })
}
