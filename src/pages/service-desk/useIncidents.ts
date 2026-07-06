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
  requester_id: string
  requester: { full_name: string; avatar_initials: string | null } | null
  assignee: { full_name: string; avatar_initials: string | null } | null
}

export interface IncidentDetail extends IncidentListItem {
  description: string | null
  csat_score: number | null
  resolved_at: string | null
  closed_at: string | null
  is_major_incident: boolean
  major_incident_declared_at: string | null
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
  id, ref, title, priority, status, channel, category, created_at, sla_due_at, requester_id,
  requester:requester_id ( full_name, avatar_initials ),
  assignee:assignee_id ( full_name, avatar_initials )
`

// ------------------------------------------------------------------
// ÇALIŞAN MERKEZİ: requester'ın KENDİ oluşturduğu talepler
// (yukarıdaki 'mine' görünümü assignee_id'ye göre filtreler — bu
// agent'lar için; requester'lar için requester_id gerekiyor).
// ------------------------------------------------------------------
export function useMyRequests() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['my-requests', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(SELECT_LIST)
        .eq('requester_id', profile!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as IncidentListItem[]
    },
  })
}

// ------------------------------------------------------------------
// LIST
// ------------------------------------------------------------------
export function useIncidents(view: SavedView, channel?: TicketChannel | 'all') {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['incidents', view, channel, profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select(SELECT_LIST)
        .order('created_at', { ascending: false })

      if (channel && channel !== 'all') {
        query = query.eq('channel', channel)
      }

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
        .select(`${SELECT_LIST}, description, csat_score, resolved_at, closed_at, is_major_incident, major_incident_declared_at`)
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
          ci_id: null,
          resolved_at: null,
          closed_at: null,
          is_major_incident: false,
          major_incident_declared_at: null,
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
    mutationFn: async (patch: Partial<{ status: TicketStatus; assignee_id: string | null; priority: Priority; csat_score: number }>) => {
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

// ------------------------------------------------------------------
// SERVİS MASASI ANALİTİK — kanal dağılımı, teknisyen CSAT lideri
// ------------------------------------------------------------------
export interface ChannelDistribution {
  channel: string
  ticket_count: number
}

export function useChannelDistribution() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['channel-distribution', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_channel_distribution', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as ChannelDistribution[]
    },
  })
}

export interface TechnicianCsat {
  technician_id: string
  full_name: string
  avg_csat: number
  ticket_count: number
}

export function useTechnicianCsatLeaderboard() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['technician-csat', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_technician_csat_leaderboard', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as TechnicianCsat[]
    },
  })
}

// ------------------------------------------------------------------
// TEKRARLAYAN TALEP TESPİTİ & BİRLEŞTİRME
// ------------------------------------------------------------------
export interface DuplicateCandidate {
  id: string
  ref: string
  title: string
  status: TicketStatus
  created_at: string
}

/** Aynı kategoride, açık, kendisi hariç başka olayları önerir —
 * gerçek bir benzerlik motoru değil ama gerçek, kullanışlı bir sinyal. */
export function useDuplicateCandidates(incidentId: string, category: string | null) {
  return useQuery({
    queryKey: ['duplicate-candidates', incidentId, category],
    enabled: !!category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, ref, title, status, created_at')
        .eq('category', category!)
        .neq('id', incidentId)
        .not('status', 'in', '(resolved,closed,merged)')
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data as DuplicateCandidate[]
    },
  })
}

export function useMergeIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { incidentId: string; mergeIntoId: string }) => {
      const { error } = await supabase
        .from('incidents')
        .update({ status: 'merged', possible_duplicate_of: input.mergeIntoId })
        .eq('id', input.incidentId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] })
      qc.invalidateQueries({ queryKey: ['incident'] })
    },
  })
}

// ------------------------------------------------------------------
// BÜYÜK OLAY (MAJOR INCIDENT) WAR ROOM
// ------------------------------------------------------------------
export interface MajorIncident {
  id: string
  ref: string
  title: string
  status: TicketStatus
  major_incident_declared_at: string | null
}

export function useMajorIncidents() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['major-incidents', profile?.tenantId],
    enabled: !!profile,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, ref, title, status, major_incident_declared_at')
        .eq('is_major_incident', true)
        .not('status', 'in', '(resolved,closed,merged)')
        .order('major_incident_declared_at', { ascending: false })
      if (error) throw error
      return data as MajorIncident[]
    },
  })
}

export function useToggleMajorIncident(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (isMajor: boolean) => {
      const { error } = await supabase.from('incidents').update({ is_major_incident: isMajor }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['major-incidents'] })
      qc.invalidateQueries({ queryKey: ['incident', id] })
      qc.invalidateQueries({ queryKey: ['incidents'] })
    },
  })
}

export interface Responder {
  user_id: string
  full_name: string
}

export function useIncidentResponders(incidentId: string) {
  return useQuery({
    queryKey: ['incident-responders', incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_responders')
        .select('user_id, user:user_id ( full_name )')
        .eq('incident_id', incidentId)
      if (error) throw error
      return (data as unknown as { user_id: string; user: { full_name: string } }[]).map((r) => ({
        user_id: r.user_id,
        full_name: r.user.full_name,
      })) as Responder[]
    },
  })
}

export function useAddResponder(incidentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('incident_responders').insert({ incident_id: incidentId, user_id: userId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incident-responders', incidentId] }),
  })
}

export function useRemoveResponder(incidentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('incident_responders').delete().eq('incident_id', incidentId).eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incident-responders', incidentId] }),
  })
}

// ------------------------------------------------------------------
// 14 GÜNLÜK HACİM TRENDİ
// ------------------------------------------------------------------
export interface DailyVolume {
  day: string
  created_count: number
  resolved_count: number
}

export function useDailyVolume() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['service-desk-daily-volume', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_service_desk_daily_volume', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as DailyVolume[]
    },
  })
}
