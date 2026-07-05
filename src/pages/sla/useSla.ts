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
  sla_policy_id: string | null
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
        .select('id, ref, title, priority, status, sla_due_at, sla_policy_id, created_at')
        .not('sla_due_at', 'is', null)
        .not('status', 'in', '(resolved,closed,merged)')
        .order('sla_due_at', { ascending: true })
      if (error) throw error
      return data as MonitoredIncident[]
    },
    refetchInterval: 30_000, // 30 saniyede bir tazele — countdown'lar canlı kalsın
  })
}

// ------------------------------------------------------------------
// ESKALASYON MATRİSİ
// ------------------------------------------------------------------
export interface EscalationLevel {
  id: string
  sla_policy_id: string
  level: number
  trigger_percent: number
  notify_role: 'agent' | 'manager' | 'tenant_admin'
}

export function useEscalationLevels(policyId: string | null) {
  return useQuery({
    queryKey: ['escalation-levels', policyId],
    enabled: !!policyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_escalation_levels')
        .select('id, sla_policy_id, level, trigger_percent, notify_role')
        .eq('sla_policy_id', policyId!)
        .order('level')
      if (error) throw error
      return data as EscalationLevel[]
    },
  })
}

/** Tüm politikaların eskalasyon seviyeleri — İzleme ekranında her
 * olayın hangi seviyeye ulaştığını hesaplamak için tek sorguda çekilir. */
export function useAllEscalationLevels() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['all-escalation-levels', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_escalation_levels')
        .select('id, sla_policy_id, level, trigger_percent, notify_role')
        .order('level')
      if (error) throw error
      return data as EscalationLevel[]
    },
  })
}

export function useCreateEscalationLevel(policyId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { level: number; triggerPercent: number; notifyRole: 'agent' | 'manager' | 'tenant_admin' }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('sla_escalation_levels').insert({
        tenant_id: profile.tenantId,
        sla_policy_id: policyId,
        level: input.level,
        trigger_percent: input.triggerPercent,
        notify_role: input.notifyRole,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escalation-levels', policyId] })
      qc.invalidateQueries({ queryKey: ['all-escalation-levels'] })
    },
  })
}

export function useDeleteEscalationLevel(policyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sla_escalation_levels').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escalation-levels', policyId] })
      qc.invalidateQueries({ queryKey: ['all-escalation-levels'] })
    },
  })
}

/** Bir olayın elapsed % değerine göre hangi eskalasyon seviyesine
 * ulaştığını hesaplar — gerçek zamanlı, sunucu tarafı gerektirmez. */
export function computeTriggeredLevel(
  incident: MonitoredIncident,
  levelsByPolicy: EscalationLevel[]
): EscalationLevel | null {
  if (!incident.sla_due_at || !incident.sla_policy_id) return null
  const levels = levelsByPolicy.filter((l) => l.sla_policy_id === incident.sla_policy_id)
  if (!levels.length) return null

  const created = new Date(incident.created_at).getTime()
  const due = new Date(incident.sla_due_at).getTime()
  const totalMs = due - created
  if (totalMs <= 0) return null

  const elapsedPercent = ((Date.now() - created) / totalMs) * 100

  // En yüksek tetiklenen seviyeyi bul (trigger_percent <= elapsedPercent olanlar arasında en büyüğü)
  const triggered = levels.filter((l) => l.trigger_percent <= elapsedPercent).sort((a, b) => b.trigger_percent - a.trigger_percent)
  return triggered[0] ?? null
}
