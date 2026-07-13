import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface IntegrationEndpoint {
  id: string
  site_id: string
  name: string
  endpoint_url: string
  http_method: string
  auth_header_name: string | null
  poll_interval_minutes: number
  is_active: boolean
  last_synced_at: string | null
  last_status: 'success' | 'error' | 'partial' | null
  site: { name: string } | null
}

export function useIntegrationEndpoints() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['integration-endpoints', profile?.tenantId],
    enabled: !!profile,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_endpoints')
        .select('id, site_id, name, endpoint_url, http_method, auth_header_name, poll_interval_minutes, is_active, last_synced_at, last_status, site:site_id ( name )')
        .order('name')
      if (error) throw error
      return data as unknown as IntegrationEndpoint[]
    },
  })
}

export function useCreateIntegrationEndpoint() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: {
      siteId: string
      name: string
      endpointUrl: string
      httpMethod: string
      authHeaderName: string
      authHeaderValue: string
      pollIntervalMinutes: number
    }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('integration_endpoints').insert({
        tenant_id: profile.tenantId,
        site_id: input.siteId,
        name: input.name,
        endpoint_url: input.endpointUrl,
        http_method: input.httpMethod,
        auth_header_name: input.authHeaderName || null,
        auth_header_value: input.authHeaderValue || null,
        poll_interval_minutes: input.pollIntervalMinutes,
        is_active: true,
        created_by: profile.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integration-endpoints'] }),
  })
}

export function useUpdateIntegrationEndpoint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; isActive?: boolean }) => {
      const patch: { is_active?: boolean } = {}
      if (input.isActive !== undefined) patch.is_active = input.isActive
      const { error } = await supabase.from('integration_endpoints').update(patch).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integration-endpoints'] }),
  })
}

export function useDeleteIntegrationEndpoint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('integration_endpoints').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integration-endpoints'] }),
  })
}

export function useSyncNow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (endpointId?: string) => {
      const { data, error } = await supabase.functions.invoke('store-integration-sync', {
        body: endpointId ? { endpointId } : {},
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data as { synced: number; results: { endpointId: string; status: string; devicesUpdated: number; message: string }[] }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integration-endpoints'] })
      qc.invalidateQueries({ queryKey: ['integration-logs'] })
      qc.invalidateQueries({ queryKey: ['integration-summary'] })
      qc.invalidateQueries({ queryKey: ['cmdb'] })
      qc.invalidateQueries({ queryKey: ['store-health-scores'] })
    },
  })
}

export interface IntegrationLog {
  id: string
  status: 'success' | 'error' | 'partial'
  http_status: number | null
  duration_ms: number | null
  devices_updated: number
  message: string | null
  created_at: string
  endpoint: { name: string; site: { name: string } | null } | null
}

export function useIntegrationLogs(endpointId?: string) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['integration-logs', profile?.tenantId, endpointId],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase
        .from('integration_logs')
        .select('id, status, http_status, duration_ms, devices_updated, message, created_at, endpoint:endpoint_id ( name, site:site_id ( name ) )')
        .order('created_at', { ascending: false })
        .limit(50)
      if (endpointId) query = query.eq('endpoint_id', endpointId)
      const { data, error } = await query
      if (error) throw error
      return data as unknown as IntegrationLog[]
    },
  })
}

export interface IntegrationSummary {
  site_id: string
  site_name: string
  active_endpoints: number
  last_synced_at: string | null
  last_status: 'success' | 'error' | 'partial' | null
}

export function useIntegrationSummary() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['integration-summary', profile?.tenantId],
    enabled: !!profile,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_integration_summary', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as IntegrationSummary[]
    },
  })
}

export function useMyStoreIntegrationSummary() {
  const { profile } = useAuth()
  const { data } = useIntegrationSummary()
  return data?.find((s) => s.site_id === profile?.siteId) ?? null
}
