import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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

// ------------------------------------------------------------------
// Faz BN — MAĞAZA IT SAĞLIĞI SKORU (A/B/C, 4 sütun: ESL/Kiosk/Network/Yardım Masası)
// ------------------------------------------------------------------
export interface StoreHealthScore {
  site_id: string
  site_name: string
  week_start: string
  esl_score: number
  kiosk_score: number
  network_score: number
  helpdesk_score: number
  composite_score: number
  letter_grade: 'A' | 'B' | 'C'
  esl_offline_pct: number
  kiosk_uptime_pct: number
  network_downtime_minutes: number
  helpdesk_call_count: number
  helpdesk_sla_breach_count: number
}

export function currentWeekStart(): string {
  const d = new Date()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return monday.toISOString().slice(0, 10)
}

export function useStoreHealthScores(weekStart: string) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['store-health-scores', profile?.tenantId, weekStart],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_store_health_scores', { p_tenant_id: profile!.tenantId, p_week_start: weekStart })
      if (error) throw error
      return data as StoreHealthScore[]
    },
  })
}

export function useGenerateWeeklyScores() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (weekStart?: string) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { data, error } = await supabase.rpc('generate_weekly_store_health_scores', { p_tenant_id: profile.tenantId, p_week_start: weekStart })
      if (error) throw error
      return data as number
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-health-scores'] }),
  })
}

// ------------------------------------------------------------------
// Faz MP — MAĞAZA PERFORMANSI 2.0 (Günlük/Haftalık/Aylık/Yıllık periyot)
// ------------------------------------------------------------------
export type StorePeriod = 'day' | 'week' | 'month' | 'year'
const VALID_PERIODS: StorePeriod[] = ['day', 'week', 'month', 'year']

/** G/H/A/Y periyot seçimini URL'de (?period=week) kalıcı tutar — sayfa
 * yenilense ya da paylaşılsa da seçim korunur. Tüm Mağaza Performansı
 * sekmeleri aynı URL parametresini okur. */
export function useStorePeriod(defaultPeriod: StorePeriod = 'week') {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('period')
  const period: StorePeriod = (VALID_PERIODS as string[]).includes(raw ?? '') ? (raw as StorePeriod) : defaultPeriod

  function setPeriod(p: StorePeriod) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('period', p)
        return next
      },
      { replace: true }
    )
  }

  return [period, setPeriod] as const
}

export interface StoreTicketStats {
  status_new: number
  status_open: number
  status_in_progress: number
  status_on_hold: number
  status_resolved: number
  status_closed: number
  status_merged: number
  priority_p1: number
  priority_p2: number
  priority_p3: number
  priority_p4: number
  opened_count: number
  resolved_count: number
  avg_resolution_hours: number | null
  prev_period_opened: number
  prev_period_resolved: number
}

export function useStoreTicketStats(siteId: string | null, period: StorePeriod) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['store-ticket-stats', siteId, period],
    enabled: !!siteId && !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_store_ticket_stats', {
        p_tenant_id: profile!.tenantId,
        p_site_id: siteId!,
        p_period: period,
      })
      if (error) throw error
      return (data?.[0] ?? null) as StoreTicketStats | null
    },
  })
}

export type StoreHealthCategory = 'esl' | 'kiosk_pos' | 'network' | 'other'

export interface StoreAvailabilityRow {
  ci_id: string
  name: string
  ci_type: string
  line_type: string | null
  availability_percent: number | null
  availability_target: number | null
  is_currently_online: boolean
  downtime_minutes: number | null
  event_count: number
}

/** category verilirse o kategoriyle sınırlar; uncategorized=true ise
 * (Envanter SLA sekmesi) store_health_category NULL olan CI'ları getirir —
 * bu ikisi birbirini dışlar. */
export function useStoreAvailability(
  siteId: string | null,
  period: StorePeriod,
  options?: { category?: StoreHealthCategory | null; uncategorized?: boolean }
) {
  const { profile } = useAuth()
  const category = options?.category ?? null
  const uncategorized = options?.uncategorized ?? false
  return useQuery({
    queryKey: ['store-availability', siteId, period, category, uncategorized],
    enabled: !!siteId && !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_store_availability', {
        p_tenant_id: profile!.tenantId,
        p_site_id: siteId!,
        p_period: period,
        p_category: category,
        p_uncategorized: uncategorized,
      })
      if (error) throw error
      return data as StoreAvailabilityRow[]
    },
  })
}

export interface StoreCategorySummary {
  category: StoreHealthCategory
  avg_availability_percent: number | null
  below_target_count: number
  total_count: number
}

export function useStoreCategorySummary(siteId: string | null, period: StorePeriod) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['store-category-summary', siteId, period],
    enabled: !!siteId && !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_store_category_summary', {
        p_tenant_id: profile!.tenantId,
        p_site_id: siteId!,
        p_period: period,
      })
      if (error) throw error
      return data as StoreCategorySummary[]
    },
  })
}

export interface ScoreTrendPoint {
  period_label: string
  score: number
}

export function useStoreScoreTrend(siteId: string | null, period: StorePeriod) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['store-score-trend', siteId, period],
    enabled: !!siteId && !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_store_score_trend', {
        p_tenant_id: profile!.tenantId,
        p_site_id: siteId!,
        p_period: period,
      })
      if (error) throw error
      return data as ScoreTrendPoint[]
    },
  })
}

/** Envanter SLA sekmesindeki ci_status mini bar'ı için — get_store_
 * availability RPC'si retired CI'ları bilerek hariç tuttuğundan (aktif
 * çalışırlık hesaplamasında anlamsız), bu kırılım doğrudan tablodan
 * ayrıca çekilir. */
export function useInventoryStatusBreakdown(siteId: string | null) {
  return useQuery({
    queryKey: ['inventory-status-breakdown', siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuration_items')
        .select('status')
        .eq('site_id', siteId!)
        .is('store_health_category', null)
      if (error) throw error
      const counts = { active: 0, in_repair: 0, retired: 0, unmanaged: 0 }
      for (const row of data as { status: keyof typeof counts }[]) {
        counts[row.status] = (counts[row.status] ?? 0) + 1
      }
      return counts
    },
  })
}

export interface DeviceStatusEvent {
  id: string
  is_online: boolean
  occurred_at: string
}

/** CI availability drawer'ının olay zaman çizelgesi — son 50 olay. */
export function useCiEventTimeline(ciId: string | null) {
  return useQuery({
    queryKey: ['ci-event-timeline', ciId],
    enabled: !!ciId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_status_events')
        .select('id, is_online, occurred_at')
        .eq('ci_id', ciId!)
        .order('occurred_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as DeviceStatusEvent[]
    },
  })
}

/** Anlık hat/cihaz durumu — device_status_events'e tenant kanalından
 * subscribe olur (ci_id'ye göre değil, çünkü bir mağazadaki tüm CI'ların
 * ayrı ayrı kanala bağlanması gereksiz karmaşıklık olurdu); bu bileşenin
 * ilgilendiği site'a ait query'leri invalidate ederek "istemci tarafı
 * filtre"yi query key granülerliği üzerinden uygular. */
export function useDeviceStatusRealtime(siteId: string | null) {
  const qc = useQueryClient()
  const { profile } = useAuth()

  useEffect(() => {
    if (!profile || !siteId) return
    const channel = supabase
      .channel(`device-status-${profile.tenantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'device_status_events', filter: `tenant_id=eq.${profile.tenantId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['store-availability', siteId] })
          qc.invalidateQueries({ queryKey: ['store-category-summary', siteId] })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, siteId, qc])
}
