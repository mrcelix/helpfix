import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { NotificationType } from '@/types/database'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export function useNotifications() {
  const { profile } = useAuth()
  const qc = useQueryClient()

  // Gerçek zamanlı: yeni bir bildirim geldiğinde listeyi otomatik tazele.
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('notifications-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        () => qc.invalidateQueries({ queryKey: ['notifications'] })
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, qc])

  return useQuery({
    queryKey: ['notifications', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, body, link, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data as Notification[]
    },
    // Gerçek zamanlı abonelik (yukarıda) yeni bildirimleri zaten anlık
    // yakalıyor — bu interval sadece bağlantı kopması ihtimaline karşı
    // bir yedek. Her kullanıcı oturumu için sürekli 60sn'de bir sorgu
    // atmamak için aralık uzatıldı.
    refetchInterval: 5 * 60_000,
  })
}

export function useMarkAsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllAsRead() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async () => {
      if (!profile) return
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
