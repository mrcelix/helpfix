import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Priority, TicketStatus } from '@/types/database'

const REFRESH_MS = 20_000

export interface WallboardIncident {
  id: string
  ref: string
  title: string
  priority: Priority
  status: TicketStatus
  created_at: string
  sla_due_at: string | null
  assignee: { full_name: string } | null
}

const WALLBOARD_SELECT = `
  id, ref, title, priority, status, created_at, sla_due_at,
  assignee:assignee_id ( full_name )
`

/** Duvar ekranındaki tüm açık kayıtları getirir (kapanmamış durumlar) —
 * hem öncelik dağılımı hem de SLA risk listesi bu tek sorgudan türetilir. */
export function useWallboardIncidents() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['wallboard-incidents', profile?.tenantId],
    enabled: !!profile,
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(WALLBOARD_SELECT)
        .not('status', 'in', '(resolved,closed,merged)')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as unknown as WallboardIncident[]
    },
  })
}

/** Bugün çözülen/kapatılan kayıt sayısı. */
export function useWallboardResolvedToday() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['wallboard-resolved-today', profile?.tenantId],
    enabled: !!profile,
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const { count, error } = await supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .in('status', ['resolved', 'closed'])
        .gte('resolved_at', startOfDay.toISOString())
      if (error) throw error
      return count ?? 0
    },
  })
}

export interface WallboardMajorIncident {
  id: string
  ref: string
  title: string
}

/** Aktif Büyük Olay(lar) — banner için. */
export function useWallboardMajorIncidents() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['wallboard-major-incidents', profile?.tenantId],
    enabled: !!profile,
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, ref, title')
        .eq('is_major_incident', true)
        .not('status', 'in', '(resolved,closed,merged)')
      if (error) throw error
      return data as WallboardMajorIncident[]
    },
  })
}
