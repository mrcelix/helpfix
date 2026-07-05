import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Priority } from '@/types/database'

export interface SlaPolicy {
  id: string
  name: string
  priority: Priority
  response_time_minutes: number
  resolution_time_minutes: number
  escalation_warning_percent: number
  is_active: boolean
}

export interface MonitoredIncident {
  id: string
  ref: string
  title: string
  priority: Priority
  status: string
  sla_due_at: string | null
  created_at: string
}

export function usePolicies() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['sla-policies', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_policies')
        .select('id, name, priority, response_time_minutes, resolution_time_minutes, escalation_warning_percent, is_active')
        .order('priority')
      if (error) throw error
      return data as SlaPolicy[]
    },
  })
}

export function useCreatePolicy() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: {
      name: string
      priority: Priority
      response_time_minutes: number
      resolution_time_minutes: number
    }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('sla_policies').insert({
        tenant_id: profile.tenantId,
        name: input.name,
        priority: input.priority,
        response_time_minutes: input.response_time_minutes,
        resolution_time_minutes: input.resolution_time_minutes,
        escalation_warning_percent: 80,
        is_active: true,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sla-policies'] }),
  })
}

export function useTogglePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('sla_policies').update({ is_active: input.is_active }).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sla-policies'] }),
  })
}

/** Açık ve sla_due_at'i olan tüm olayları çeker; risk/ihlal durumu
 * istemci tarafında (saat bazlı) hesaplanır ki canlı geri sayım
 * çalışsın. */
export function useMonitoredIncidents() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['sla-monitored-incidents', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, ref, title, priority, status, sla_due_at, created_at')
        .not('sla_due_at', 'is', null)
        .not('status', 'in', '(resolved,closed,merged)')
        .order('sla_due_at', { ascending: true })
      if (error) throw error
      return data as MonitoredIncident[]
    },
    refetchInterval: 30_000, // 30 saniyede bir tazele — countdown'lar canlı kalsın
  })
}
