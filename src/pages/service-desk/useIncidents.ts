import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Priority, TicketStatus, TicketChannel } from '@/types/database'

// ------------------------------------------------------------------
// Tipler — Supabase Database tipimiz Relationships tanımlamıyor,
// bu yüzden join'li select'lerin sonucunu burada elle tipliyoruz.
// ------------------------------------------------------------------
export interface IncidentListItem {
  id: string
  ref: string
  title: string
  priority: Priority
  status: TicketStatus
  channel: TicketChannel
  category: string | null
  created_at: string
  sla_due_at: string | null
  requester: { full_name: string; avatar_initials: string | null } | null
  assignee: { full_name: string; avatar_initials: string | null } | null
}

export interface IncidentDetail extends IncidentListItem {
  description: string | null
  csat_score: number | null
  resolved_at: string | null
  closed_at: string | null
}

export interface IncidentComment {
  id: string
  body: string
  is_internal: boolean
  created_at: string
  author: { full_name: string; avatar_initials: string | null } | null
}

export interface IncidentTimelineEvent {
  id: string
  event_type: string
  event_data: Record<string, unknown> | null
  created_at: string
  actor: { full_name: string } | null
}

export type SavedView = 'all' | 'mine' | 'unassigned' | 'open'

const SELECT_LIST = `
  id, ref, title, priority, status, channel, category, created_at, sla_due_at,
  requester:requester_id ( full_name, avatar_initials ),
  assignee:assignee_id ( full_name, avatar_initials )
`

// ------------------------------------------------------------------
// LIST
// ------------------------------------------------------------------
export function useIncidents(view: SavedView) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['incidents', view, profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select(SELECT_LIST)
        .order('created_at', { ascending: false })

      if (view === 'mine' && profile) {
        query = query.eq('assignee_id', profile.id)
      } else if (view === 'unassigned') {
        query = query.is('assignee_id', null)
      } else if (view === 'open') {
        query = query.in('status', ['new', 'open', 'in_progress', 'on_hold'])
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as IncidentListItem[]
    },
  })
}

// ------------------------------------------------------------------
// DETAIL (ticket + comments + timeline)
// ------------------------------------------------------------------
export function useIncidentDetail(id: string | null) {
  return useQuery({
    queryKey: ['incident', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`${SELECT_LIST}, description, csat_score, resolved_at, closed_at`)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as IncidentDetail
    },
  })
}

export function useIncidentComments(incidentId: string | null) {
  return useQuery({
    queryKey: ['incident-comments', incidentId],
    enabled: !!incidentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_comments')
        .select('id, body, is_internal, created_at, author:author_id ( full_name, avatar_initials )')
        .eq('incident_id', incidentId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as unknown as IncidentComment[]
    },
  })
}

export function useIncidentTimeline(incidentId: string | null) {
  return useQuery({
    queryKey: ['incident-timeline', incidentId],
    enabled: !!incidentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_timeline')
        .select('id, event_type, event_data, created_at, actor:actor_id ( full_name )')
        .eq('incident_id', incidentId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as IncidentTimelineEvent[]
    },
  })
}

// ------------------------------------------------------------------
// MUTATIONS
// ------------------------------------------------------------------
export function useCreateIncident() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      title: string
      description: string
      priority: Priority
      category: string | null
    }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { data, error } = await supabase
        .from('incidents')
        .insert({
          tenant_id: profile.tenantId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          category: input.category,
          status: 'new',
          channel: 'portal',
          requester_id: profile.id,
          assignee_id: null,
          possible_duplicate_of: null,
          sla_policy_id: null,
          sla_due_at: null,
          csat_score: null,
          resolved_at: null,
          closed_at: null,
        })
        .select('id, ref')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] })
    },
  })
}

export function useUpdateIncident(id: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (patch: Partial<{ status: TicketStatus; assignee_id: string | null; priority: Priority }>) => {
      const { error } = await supabase.from('incidents').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] })
      qc.invalidateQueries({ queryKey: ['incident', id] })
      qc.invalidateQueries({ queryKey: ['incident-timeline', id] })
    },
  })
}

export function useAddComment(incidentId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (input: { body: string; isInternal: boolean }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('incident_comments').insert({
        incident_id: incidentId,
        author_id: profile.id,
        body: input.body,
        is_internal: input.isInternal,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident-comments', incidentId] })
    },
  })
}
