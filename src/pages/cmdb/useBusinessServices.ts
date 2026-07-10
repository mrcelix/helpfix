import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type ServiceCriticality = 'critical' | 'high' | 'medium' | 'low'
export type ServiceHealthStatus = 'operational' | 'degraded' | 'outage'

export interface BusinessServiceHealth {
  service_id: string
  service_name: string
  criticality: ServiceCriticality
  owner_name: string | null
  open_incidents: number
  critical_open_incidents: number
  has_active_major_incident: boolean
  linked_ci_count: number
  online_ci_pct: number
  health_status: ServiceHealthStatus
}

export function useBusinessServiceHealth() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['business-service-health', profile?.tenantId],
    enabled: !!profile,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_business_service_health', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as BusinessServiceHealth[]
    },
  })
}

export function useBusinessServicesList() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['business-services-list', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('business_services').select('id, name, criticality').eq('is_active', true).order('name')
      if (error) throw error
      return data as { id: string; name: string; criticality: ServiceCriticality }[]
    },
  })
}

export function useCreateBusinessService() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { name: string; description: string; criticality: ServiceCriticality; ownerId: string | null }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('business_services').insert({
        tenant_id: profile.tenantId,
        name: input.name,
        description: input.description || null,
        criticality: input.criticality,
        owner_id: input.ownerId,
        is_active: true,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-service-health'] })
      qc.invalidateQueries({ queryKey: ['business-services-list'] })
    },
  })
}

export function useDeactivateBusinessService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('business_services').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-service-health'] })
      qc.invalidateQueries({ queryKey: ['business-services-list'] })
    },
  })
}

export interface ServiceLinkedCi {
  id: string
  tag: string
  name: string
  is_online: boolean
}

export function useServiceLinkedCis(serviceId: string | null) {
  return useQuery({
    queryKey: ['service-linked-cis', serviceId],
    enabled: !!serviceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_service_cis')
        .select('ci:ci_id ( id, tag, name, is_online )')
        .eq('business_service_id', serviceId!)
      if (error) throw error
      return (data as unknown as { ci: ServiceLinkedCi }[]).map((r) => r.ci)
    },
  })
}

export function useLinkCiToService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { serviceId: string; ciId: string }) => {
      const { error } = await supabase.from('business_service_cis').insert({ business_service_id: input.serviceId, ci_id: input.ciId })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-linked-cis'] })
      qc.invalidateQueries({ queryKey: ['business-service-health'] })
    },
  })
}

export function useUnlinkCiFromService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { serviceId: string; ciId: string }) => {
      const { error } = await supabase.from('business_service_cis').delete().eq('business_service_id', input.serviceId).eq('ci_id', input.ciId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-linked-cis'] })
      qc.invalidateQueries({ queryKey: ['business-service-health'] })
    },
  })
}

export interface ServiceLifecycleRecord {
  id: string
  ref: string
  title: string
  status: string
  created_at: string
}

export function useServiceLifecycle(serviceId: string | null) {
  return useQuery({
    queryKey: ['service-lifecycle', serviceId],
    enabled: !!serviceId,
    queryFn: async () => {
      const [incidents, problems, changes] = await Promise.all([
        supabase.from('incidents').select('id, ref, title, status, created_at').eq('business_service_id', serviceId!).order('created_at', { ascending: false }).limit(10),
        supabase.from('problems').select('id, ref, title, status, created_at').eq('business_service_id', serviceId!).order('created_at', { ascending: false }).limit(10),
        supabase.from('changes').select('id, ref, title, status, created_at').eq('business_service_id', serviceId!).order('created_at', { ascending: false }).limit(10),
      ])
      if (incidents.error) throw incidents.error
      if (problems.error) throw problems.error
      if (changes.error) throw changes.error
      return {
        incidents: incidents.data as ServiceLifecycleRecord[],
        problems: problems.data as ServiceLifecycleRecord[],
        changes: changes.data as ServiceLifecycleRecord[],
      }
    },
  })
}
