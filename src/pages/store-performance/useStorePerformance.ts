import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface StoreScorecard {
  site_id: string
  site_name: string
  parent_site_id: string | null
  is_headquarters: boolean
  total_devices: number
  online_devices: number
  online_pct: number
  open_incidents: number
  critical_open_incidents: number
  sla_compliant_pct: number
  score: number
}

export function scoreLevel(score: number): 'good' | 'warn' | 'bad' {
  if (score >= 80) return 'good'
  if (score >= 60) return 'warn'
  return 'bad'
}

export function useStoreScorecard() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['store-scorecard', profile?.tenantId],
    enabled: !!profile,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_store_scorecard', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as StoreScorecard[]
    },
  })
}

export function useCaptureSnapshot() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { data, error } = await supabase.rpc('capture_store_score_snapshots', { p_tenant_id: profile.tenantId })
      if (error) throw error
      return data as number
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-score-history'] }),
  })
}

export interface ScoreSnapshot {
  snapshot_date: string
  score: number
  sla_compliant_pct: number
  online_pct: number
  open_incidents: number
  critical_open_incidents: number
}

export function useStoreScoreHistory(siteId: string | null, days = 30) {
  return useQuery({
    queryKey: ['store-score-history', siteId, days],
    enabled: !!siteId,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('store_score_snapshots')
        .select('snapshot_date, score, sla_compliant_pct, online_pct, open_incidents, critical_open_incidents')
        .eq('site_id', siteId!)
        .gte('snapshot_date', since)
        .order('snapshot_date')
      if (error) throw error
      return data as ScoreSnapshot[]
    },
  })
}

export interface StoreDevice {
  id: string
  tag: string
  name: string
  ci_type: string
  is_online: boolean
  last_seen_at: string
}

export function useStoreDevices(siteId: string | null) {
  return useQuery({
    queryKey: ['store-devices', siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuration_items')
        .select('id, tag, name, ci_type, is_online, last_seen_at')
        .eq('site_id', siteId!)
        .neq('status', 'retired')
        .order('is_online')
      if (error) throw error
      return data as StoreDevice[]
    },
  })
}

export interface StoreIncident {
  id: string
  ref: string
  title: string
  priority: string
  status: string
  created_at: string
}

export function useStoreIncidents(siteId: string | null) {
  return useQuery({
    queryKey: ['store-incidents', siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, ref, title, priority, status, created_at')
        .eq('site_id', siteId!)
        .order('created_at', { ascending: false })
        .limit(15)
      if (error) throw error
      return data as StoreIncident[]
    },
  })
}

export function useToggleDeviceOnline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; isOnline: boolean }) => {
      const { error } = await supabase
        .from('configuration_items')
        .update({ is_online: input.isOnline, last_seen_at: new Date().toISOString() })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-devices'] })
      qc.invalidateQueries({ queryKey: ['store-scorecard'] })
      qc.invalidateQueries({ queryKey: ['cmdb'] })
      qc.invalidateQueries({ queryKey: ['ci'] })
    },
  })
}
