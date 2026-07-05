import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Priority, ProblemStatus, FishboneCategory } from '@/types/database'

// ------------------------------------------------------------------
// Tipler
// ------------------------------------------------------------------
export interface ProblemListItem {
  id: string
  ref: string
  title: string
  status: ProblemStatus
  priority: Priority
  category: string | null
  is_known_error: boolean
  created_at: string
  owner: { full_name: string; avatar_initials: string | null } | null
}

export interface ProblemDetail extends ProblemListItem {
  description: string | null
  root_cause: string | null
  known_error_workaround: string | null
  resolved_at: string | null
}

export interface LinkedIncident {
  incident_id: string
  incident: { ref: string; title: string; status: string; created_at: string } | null
}

export interface ClusterCandidate {
  category: string
  incident_count: number
  sample_incident_ids: string[]
  sample_titles: string[]
  earliest_created_at: string
}

export type ProblemSavedView = 'all' | 'mine' | 'known_errors' | 'open'

const SELECT_LIST = `
  id, ref, title, status, priority, category, is_known_error, created_at,
  owner:owner_id ( full_name, avatar_initials )
`

// ------------------------------------------------------------------
// LIST
// ------------------------------------------------------------------
export function useProblems(view: ProblemSavedView) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['problems', view, profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase.from('problems').select(SELECT_LIST).order('created_at', { ascending: false })

      if (view === 'mine' && profile) {
        query = query.eq('owner_id', profile.id)
      } else if (view === 'known_errors') {
        query = query.eq('is_known_error', true)
      } else if (view === 'open') {
        query = query.not('status', 'in', '(resolved,closed)')
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as ProblemListItem[]
    },
  })
}

export function useProblemDetail(id: string | null) {
  return useQuery({
    queryKey: ['problem', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('problems')
        .select(`${SELECT_LIST}, description, root_cause, known_error_workaround, resolved_at`)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as ProblemDetail
    },
  })
}

export function useLinkedIncidents(problemId: string | null) {
  return useQuery({
    queryKey: ['problem-incidents', problemId],
    enabled: !!problemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('problem_incidents')
        .select('incident_id, incident:incident_id ( ref, title, status, created_at )')
        .eq('problem_id', problemId!)
      if (error) throw error
      return data as unknown as LinkedIncident[]
    },
  })
}

export function useProblemTimeline(problemId: string | null) {
  return useQuery({
    queryKey: ['problem-timeline', problemId],
    enabled: !!problemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('problem_timeline')
        .select('id, event_type, event_data, created_at, actor:actor_id ( full_name )')
        .eq('problem_id', problemId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as { id: string; event_type: string; created_at: string; actor: { full_name: string } | null }[]
    },
  })
}

// ------------------------------------------------------------------
// AI PROAKTİF TESPİT — son 7 günde aynı kategoride 3+ olay kümesi
// ------------------------------------------------------------------
export function useClusterCandidates() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['incident-clusters', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_incident_cluster_candidates', {
        p_tenant_id: profile!.tenantId,
      })
      if (error) throw error
      return data as ClusterCandidate[]
    },
    staleTime: 5 * 60_000,
  })
}

// ------------------------------------------------------------------
// MUTATIONS
// ------------------------------------------------------------------
export function useCreateProblem() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      title: string
      description: string
      priority: Priority
      category: string | null
      incidentIds?: string[]
    }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { data, error } = await supabase
        .from('problems')
        .insert({
          tenant_id: profile.tenantId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          category: input.category,
          status: 'investigating',
          is_known_error: false,
          root_cause: null,
          known_error_workaround: null,
          owner_id: profile.id,
          ci_id: null,
          resolved_at: null,
        })
        .select('id, ref')
        .single()
      if (error) throw error

      if (input.incidentIds?.length) {
        const links = input.incidentIds.map((incident_id) => ({ problem_id: data.id, incident_id }))
        const { error: linkError } = await supabase.from('problem_incidents').insert(links)
        if (linkError) throw linkError
      }

      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['problems'] })
      qc.invalidateQueries({ queryKey: ['incident-clusters'] })
    },
  })
}

export interface FishboneCause {
  id: string
  category: FishboneCategory
  description: string
  is_confirmed_root_cause: boolean
}

export function useFishboneCauses(problemId: string | null) {
  return useQuery({
    queryKey: ['fishbone', problemId],
    enabled: !!problemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('problem_fishbone_causes')
        .select('id, category, description, is_confirmed_root_cause')
        .eq('problem_id', problemId!)
        .order('created_at')
      if (error) throw error
      return data as FishboneCause[]
    },
  })
}

export function useAddFishboneCause(problemId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { category: FishboneCategory; description: string }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('problem_fishbone_causes').insert({
        tenant_id: profile.tenantId,
        problem_id: problemId,
        category: input.category,
        description: input.description,
        is_confirmed_root_cause: false,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fishbone', problemId] }),
  })
}

export function useDeleteFishboneCause(problemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('problem_fishbone_causes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fishbone', problemId] }),
  })
}

/** Bir adayı "onaylanmış kök neden" olarak işaretler ve problemin
 * root_cause alanına otomatik yazar. */
export function useConfirmRootCause(problemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cause: FishboneCause) => {
      const { error: e1 } = await supabase
        .from('problem_fishbone_causes')
        .update({ is_confirmed_root_cause: false })
        .eq('problem_id', problemId)
      if (e1) throw e1

      const { error: e2 } = await supabase
        .from('problem_fishbone_causes')
        .update({ is_confirmed_root_cause: true })
        .eq('id', cause.id)
      if (e2) throw e2

      const { error: e3 } = await supabase
        .from('problems')
        .update({ root_cause: cause.description, status: 'root_cause_identified' })
        .eq('id', problemId)
      if (e3) throw e3
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fishbone', problemId] })
      qc.invalidateQueries({ queryKey: ['problem', problemId] })
      qc.invalidateQueries({ queryKey: ['problems'] })
    },
  })
}

export function useUpdateProblem(id: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (
      patch: Partial<{
        status: ProblemStatus
        owner_id: string | null
        priority: Priority
        root_cause: string | null
        is_known_error: boolean
        known_error_workaround: string | null
        resolved_at: string | null
      }>
    ) => {
      const { error } = await supabase.from('problems').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['problems'] })
      qc.invalidateQueries({ queryKey: ['problem', id] })
    },
  })
}
