import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

/** Sidebar'daki modül isimlerinin yanında gösterilecek "dikkat
 * gerektiren" canlı sayılar — Gentelella tarzı menü rozetleri.
 * Bilinçli olarak sadece GERÇEKTEN aksiyon gerektiren, dar kapsamlı
 * sayılar seçildi (ör. tüm açık talep sayısı değil, sadece kritik
 * olanlar) — aksi halde her zaman büyük ve anlamsız bir sayı
 * gösterip "dikkat çekme" amacını kaybeder. */
export function useNavBadgeCounts() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['nav-badge-counts', profile?.tenantId],
    enabled: !!profile,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [criticalIncidents, pendingChangeApprovals, pendingRequests, pendingPos] = await Promise.all([
        supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('priority', 'P1').not('status', 'in', '(resolved,closed,merged)'),
        supabase.from('change_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('service_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
      ])

      return {
        'service-desk': criticalIncidents.count ?? 0,
        changes: pendingChangeApprovals.count ?? 0,
        catalog: pendingRequests.count ?? 0,
        purchasing: pendingPos.count ?? 0,
      } as Record<string, number>
    },
  })
}
