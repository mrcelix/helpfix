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
