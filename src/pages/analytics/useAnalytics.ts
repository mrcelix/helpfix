import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface WeeklyTrendPoint {
  week_start: string
  created_count: number
  resolved_count: number
}

export function useWeeklyTrend() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['analytics-weekly-trend', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weekly_incident_trend', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as WeeklyTrendPoint[]
    },
  })
}

export function useSlaCompliance() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['analytics-sla-compliance', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sla_compliance', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data?.[0] ?? { total_resolved: 0, breached_count: 0, compliance_percent: 100 }
    },
  })
}

export function useChangeSuccessRate() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['analytics-change-success', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_change_success_rate', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data?.[0] ?? { total_closed: 0, successful_count: 0, success_percent: 100 }
    },
  })
}

/** Öncelik dağılımı (açık kayıtlar) — client tarafında sayılıyor,
 * çünkü Supabase JS'in group-by desteği yok; küçük veri setleri için
 * (limit 500) bu performans sorunu yaratmaz. */
export function useOpenByPriority() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['analytics-open-priority', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('priority')
        .not('status', 'in', '(resolved,closed,merged)')
        .limit(500)
      if (error) throw error
      const counts: Record<string, number> = { P1: 0, P2: 0, P3: 0, P4: 0 }
      data?.forEach((r) => {
        counts[r.priority] = (counts[r.priority] ?? 0) + 1
      })
      return [
        { priority: 'P1', count: counts.P1 },
        { priority: 'P2', count: counts.P2 },
        { priority: 'P3', count: counts.P3 },
        { priority: 'P4', count: counts.P4 },
      ]
    },
  })
}

/** Karşılanan servis taleplerinin ortalama karşılanma süresi (gün). */
export function useAvgFulfillmentDays() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['analytics-fulfillment-days', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_requests')
        .select('created_at, fulfilled_at')
        .eq('status', 'fulfilled')
        .not('fulfilled_at', 'is', null)
        .limit(200)
      if (error) throw error
      if (!data?.length) return 0
      const totalDays = data.reduce((sum, r) => {
        const days = (new Date(r.fulfilled_at!).getTime() - new Date(r.created_at).getTime()) / 86_400_000
        return sum + days
      }, 0)
      return Math.round((totalDays / data.length) * 10) / 10
    },
  })
}

// ------------------------------------------------------------------
// DASHBOARD TASARIMCISI — kişiselleştirilebilir widget düzeni
// ------------------------------------------------------------------
export const AVAILABLE_WIDGETS = [
  'sla_compliance',
  'change_success',
  'fulfillment_time',
  'open_records',
  'weekly_trend',
  'priority_chart',
] as const
export type WidgetType = (typeof AVAILABLE_WIDGETS)[number]

export function useDashboardWidgets() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['dashboard-widgets', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('id, widget_type, sort_order')
        .eq('user_id', profile!.id)
        .order('sort_order')
      if (error) throw error
      // Hiç widget kaydı yoksa (ilk kullanım), tüm widget'ları varsayılan
      // sırayla göster — böylece dashboard hiç boş başlamaz.
      if (!data?.length) {
        return AVAILABLE_WIDGETS.map((w, i) => ({ id: `default-${w}`, widget_type: w, sort_order: i }))
      }
      return data
    },
  })
}

export function useSaveDashboardLayout() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (widgetTypes: WidgetType[]) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      await supabase.from('dashboard_widgets').delete().eq('user_id', profile.id)
      const rows = widgetTypes.map((w, i) => ({
        tenant_id: profile.tenantId,
        user_id: profile.id,
        widget_type: w,
        sort_order: i,
      }))
      const { error } = await supabase.from('dashboard_widgets').insert(rows)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-widgets'] }),
  })
}
