import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useMySite() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['my-site', profile?.siteId],
    enabled: !!profile?.siteId,
    queryFn: async () => {
      const { data, error } = await supabase.from('sites').select('id, name, city, is_headquarters').eq('id', profile!.siteId!).single()
      if (error) throw error
      return data
    },
  })
}

export function useMyStoreIntegrationStatus() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['my-store-integration-status', profile?.siteId],
    enabled: !!profile?.siteId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_store_integration_status')
      if (error) throw error
      return data?.[0] ?? null
    },
  })
}

export interface MyStoreHealthScore {
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

function currentWeekStart(): string {
  const d = new Date()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return monday.toISOString().slice(0, 10)
}

export function useMyStoreHealthScore() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['my-store-health', profile?.siteId],
    enabled: !!profile?.siteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_health_scores')
        .select('week_start, esl_score, kiosk_score, network_score, helpdesk_score, composite_score, letter_grade, esl_offline_pct, kiosk_uptime_pct, network_downtime_minutes, helpdesk_call_count, helpdesk_sla_breach_count')
        .eq('site_id', profile!.siteId!)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as MyStoreHealthScore | null
    },
  })
}

export interface MyStoreIncident {
  id: string
  ref: string
  title: string
  status: string
  priority: string
  created_at: string
  requester: { full_name: string } | null
}

export function useMyStoreIncidents() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['my-store-incidents', profile?.siteId],
    enabled: !!profile?.siteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, ref, title, status, priority, created_at, requester:requester_id ( full_name )')
        .eq('site_id', profile!.siteId!)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as unknown as MyStoreIncident[]
    },
  })
}

export interface MyStoreAsset {
  id: string
  name: string
  ci_type: string
  is_online: boolean
  status: string
}

export function useMyStoreAssets() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['my-store-assets', profile?.siteId],
    enabled: !!profile?.siteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuration_items')
        .select('id, name, ci_type, is_online, status')
        .eq('site_id', profile!.siteId!)
        .neq('status', 'retired')
        .order('name')
      if (error) throw error
      return data as MyStoreAsset[]
    },
  })
}

export interface MyStoreConsumable {
  id: string
  name: string
  category: string | null
  is_returnable: boolean
  total_quantity: number
  low_stock_threshold: number
}

export function useMyStoreConsumables() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['my-store-consumables', profile?.siteId],
    enabled: !!profile?.siteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consumable_items')
        .select('id, name, category, is_returnable, total_quantity, low_stock_threshold')
        .eq('site_id', profile!.siteId!)
        .order('name')
      if (error) throw error
      return data as MyStoreConsumable[]
    },
  })
}

export { currentWeekStart }
