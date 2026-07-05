import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CiType, CiStatus } from '@/types/database'

export interface CiListItem {
  id: string
  tag: string
  name: string
  ci_type: CiType
  status: CiStatus
  serial_number: string | null
  warranty_expiry: string | null
  assigned_user: { full_name: string } | null
}

export interface CiDetail extends CiListItem {
  vendor: string | null
  cost: number | null
  purchase_date: string | null
  notes: string | null
}

export type CiSavedView = 'all' | 'mine' | 'warranty_expiring' | 'unassigned'

const SELECT_LIST = `
  id, tag, name, ci_type, status, serial_number, warranty_expiry,
  assigned_user:assigned_user_id ( full_name )
`

export function useConfigurationItems(view: CiSavedView) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['cmdb', view, profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase.from('configuration_items').select(SELECT_LIST).order('created_at', { ascending: false })

      if (view === 'mine' && profile) {
        query = query.eq('assigned_user_id', profile.id)
      } else if (view === 'unassigned') {
        query = query.is('assigned_user_id', null)
      } else if (view === 'warranty_expiring') {
        const in60Days = new Date()
        in60Days.setDate(in60Days.getDate() + 60)
        query = query.lte('warranty_expiry', in60Days.toISOString().slice(0, 10)).not('warranty_expiry', 'is', null)
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as CiListItem[]
    },
  })
}

export function useCiDetail(id: string | null) {
  return useQuery({
    queryKey: ['ci', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuration_items')
        .select(`${SELECT_LIST}, vendor, cost, purchase_date, notes`)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as CiDetail
    },
  })
}

/** Bu CI'ya bağlı açık olay/problem/değişiklik sayıları — mockup'taki
 * "Açık Kayıtlar" sekmesinin gerçek, çalışan bir sürümü. */
export function useLinkedRecords(ciId: string | null) {
  return useQuery({
    queryKey: ['ci-linked-records', ciId],
    enabled: !!ciId,
    queryFn: async () => {
      const [incidents, problems, changes] = await Promise.all([
        supabase.from('incidents').select('id, ref, title, status').eq('ci_id', ciId!),
        supabase.from('problems').select('id, ref, title, status').eq('ci_id', ciId!),
        supabase.from('changes').select('id, ref, title, status').eq('ci_id', ciId!),
      ])
      if (incidents.error) throw incidents.error
      if (problems.error) throw problems.error
      if (changes.error) throw changes.error
      return {
        incidents: incidents.data ?? [],
        problems: problems.data ?? [],
        changes: changes.data ?? [],
      }
    },
  })
}

export function useCreateCi() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      name: string
      ci_type: CiType
      serial_number: string
      vendor: string
      cost: number | null
      warranty_expiry: string | null
    }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { data, error } = await supabase
        .from('configuration_items')
        .insert({
          tenant_id: profile.tenantId,
          name: input.name,
          ci_type: input.ci_type,
          status: 'active',
          serial_number: input.serial_number || null,
          assigned_user_id: null,
          vendor: input.vendor || null,
          cost: input.cost,
          purchase_date: null,
          warranty_expiry: input.warranty_expiry,
          notes: null,
        })
        .select('id, tag')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cmdb'] }),
  })
}

export function useUpdateCi(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<{ status: CiStatus; assigned_user_id: string | null; notes: string }>) => {
      const { error } = await supabase.from('configuration_items').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cmdb'] })
      qc.invalidateQueries({ queryKey: ['ci', id] })
    },
  })
}

// ------------------------------------------------------------------
// SERVİS HARİTASI: tüm CI'lar + ilişkiler (görsel graf için)
// ------------------------------------------------------------------
export interface ServiceMapNode {
  id: string
  name: string
  tag: string
  ci_type: CiType
  status: CiStatus
}

export interface ServiceMapEdge {
  id: string
  source_ci_id: string
  target_ci_id: string
  relationship_type: 'depends_on' | 'hosted_on' | 'connected_to'
}

export function useServiceMap() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['service-map', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const [nodesRes, edgesRes] = await Promise.all([
        supabase.from('configuration_items').select('id, name, tag, ci_type, status').limit(200),
        supabase.from('ci_relationships').select('id, source_ci_id, target_ci_id, relationship_type'),
      ])
      if (nodesRes.error) throw nodesRes.error
      if (edgesRes.error) throw edgesRes.error
      return {
        nodes: nodesRes.data as ServiceMapNode[],
        edges: edgesRes.data as ServiceMapEdge[],
      }
    },
  })
}

export function useCreateRelationship() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { sourceCiId: string; targetCiId: string; relationshipType: 'depends_on' | 'hosted_on' | 'connected_to' }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('ci_relationships').insert({
        tenant_id: profile.tenantId,
        source_ci_id: input.sourceCiId,
        target_ci_id: input.targetCiId,
        relationship_type: input.relationshipType,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-map'] })
      qc.invalidateQueries({ queryKey: ['ci-relationships'] })
    },
  })
}

export function useCiRelationships(ciId: string | null) {
  return useQuery({
    queryKey: ['ci-relationships', ciId],
    enabled: !!ciId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ci_relationships')
        .select('id, source_ci_id, target_ci_id, relationship_type, source:source_ci_id ( name ), target:target_ci_id ( name )')
        .or(`source_ci_id.eq.${ciId},target_ci_id.eq.${ciId}`)
      if (error) throw error
      return data as unknown as {
        id: string
        source_ci_id: string
        target_ci_id: string
        relationship_type: string
        source: { name: string } | null
        target: { name: string } | null
      }[]
    },
  })
}

export function useDeleteRelationship() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ci_relationships').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-map'] })
      qc.invalidateQueries({ queryKey: ['ci-relationships'] })
    },
  })
}

// ------------------------------------------------------------------
// YİNELENEN VARLIK TESPİTİ
// ------------------------------------------------------------------
export interface DuplicateCiGroup {
  name: string
  ci_count: number
  ci_ids: string[]
}

export function useDuplicateCis() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['duplicate-cis', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_duplicate_ci_names', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as DuplicateCiGroup[]
    },
  })
}
