import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { AlertSeverity, AlertStatus } from '@/types/database'

export interface AlertListItem {
  id: string
  source: string
  title: string
  severity: AlertSeverity
  status: AlertStatus
  fired_at: string
  incident_id: string | null
  ci: { name: string } | null
}

export type AlertSavedView = 'firing' | 'acknowledged' | 'all' | 'critical'

export function useAlerts(view: AlertSavedView) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['monitoring-alerts', view, profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase
        .from('monitoring_alerts')
        .select('id, source, title, severity, status, fired_at, incident_id, ci:ci_id ( name )')
        .order('fired_at', { ascending: false })
        .limit(200)

      if (view === 'firing') query = query.eq('status', 'firing')
      else if (view === 'acknowledged') query = query.eq('status', 'acknowledged')
      else if (view === 'critical') query = query.eq('severity', 'critical').neq('status', 'resolved')

      const { data, error } = await query
      if (error) throw error
      return data as unknown as AlertListItem[]
    },
    refetchInterval: 20_000,
  })
}

export function useDailyAlertVolume() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['monitoring-daily-volume', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_daily_alert_volume', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data
    },
  })
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('monitoring_alerts')
        .update({ status: 'acknowledged', acknowledged_by: profile?.id, acknowledged_at: new Date().toISOString() })
        .eq('id', alertId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monitoring-alerts'] }),
  })
}

export function useResolveAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('monitoring_alerts')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', alertId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monitoring-alerts'] }),
  })
}

/** Bir uyarıdan tek tıkla Servis Masası olayı oluşturur — mockup'taki
 * çapraz modül konseptinin gerçek, çalışan bir sürümü. */
export function useCreateIncidentFromAlert() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { alertId: string; title: string; description: string; ciId: string | null }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { data: incident, error } = await supabase
        .from('incidents')
        .insert({
          tenant_id: profile.tenantId,
          title: input.title,
          description: input.description,
          priority: 'P2',
          status: 'new',
          channel: 'portal',
          category: 'monitoring-alert',
          requester_id: profile.id,
          assignee_id: null,
          possible_duplicate_of: null,
          ci_id: input.ciId,
          sla_policy_id: null,
          sla_due_at: null,
          csat_score: null,
          resolved_at: null,
          closed_at: null,
          is_major_incident: false,
          major_incident_declared_at: null,
          email_message_id: null,
          custom_fields: {},
        })
        .select('id')
        .single()
      if (error) throw error

      const { error: linkError } = await supabase
        .from('monitoring_alerts')
        .update({ incident_id: incident.id })
        .eq('id', input.alertId)
      if (linkError) throw linkError

      return incident
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monitoring-alerts'] }),
  })
}

export interface MttaBySource {
  source: string
  avg_minutes: number
  alert_count: number
}

export function useMttaBySource() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['mtta-by-source', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_mtta_by_source', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as MttaBySource[]
    },
  })
}

// ------------------------------------------------------------------
// RUNBOOK'LAR — bir uyarı başlığı anahtar kelimeyle eşleşince
// gösterilecek, önceden tanımlı adım listesi.
// ------------------------------------------------------------------
export interface Runbook {
  id: string
  trigger_keyword: string
  title: string
  steps: string
}

export function useRunbooks() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['runbooks', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('monitoring_runbooks').select('id, trigger_keyword, title, steps').order('trigger_keyword')
      if (error) throw error
      return data as Runbook[]
    },
  })
}

export function useCreateRunbook() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { triggerKeyword: string; title: string; steps: string }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('monitoring_runbooks').insert({
        tenant_id: profile.tenantId,
        trigger_keyword: input.triggerKeyword,
        title: input.title,
        steps: input.steps,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['runbooks'] }),
  })
}

export function useDeleteRunbook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('monitoring_runbooks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['runbooks'] }),
  })
}

/** Verilen uyarı başlığıyla eşleşen (anahtar kelime içeren) ilk
 * runbook'u bulur — istemci tarafında basit bir eşleşme. */
export function findMatchingRunbook(alertTitle: string, runbooks: Runbook[] | undefined): Runbook | null {
  if (!runbooks) return null
  return runbooks.find((r) => alertTitle.toLowerCase().includes(r.trigger_keyword.toLowerCase())) ?? null
}
