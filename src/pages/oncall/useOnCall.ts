import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { SwapStatus } from '@/types/database'

export interface Schedule {
  id: string
  name: string
}

export interface Shift {
  id: string
  schedule_id: string
  start_time: string
  end_time: string
  user: { id: string; full_name: string; avatar_initials: string | null } | null
}

export interface SwapRequest {
  id: string
  status: SwapStatus
  created_at: string
  shift: { start_time: string; end_time: string } | null
  requested_by_user: { full_name: string } | null
  requested_to_user: { full_name: string } | null
}

export function useSchedules() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['oncall-schedules', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('oncall_schedules').select('id, name').order('name')
      if (error) throw error
      return data as Schedule[]
    },
  })
}

/** Verilen çizelgede şu anda nöbetçi olan kişi. */
export function useCurrentOnCall(scheduleId: string | null) {
  return useQuery({
    queryKey: ['oncall-current', scheduleId],
    enabled: !!scheduleId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('oncall_shifts')
        .select('id, start_time, end_time, user:user_id ( id, full_name, avatar_initials )')
        .eq('schedule_id', scheduleId!)
        .lte('start_time', now)
        .gte('end_time', now)
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as unknown as Shift | null
    },
  })
}

export function useUpcomingShifts(scheduleId: string | null) {
  return useQuery({
    queryKey: ['oncall-upcoming', scheduleId],
    enabled: !!scheduleId,
    queryFn: async () => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('oncall_shifts')
        .select('id, schedule_id, start_time, end_time, user:user_id ( id, full_name, avatar_initials )')
        .eq('schedule_id', scheduleId!)
        .gte('end_time', now)
        .order('start_time')
        .limit(14)
      if (error) throw error
      return data as unknown as Shift[]
    },
  })
}

export function useMySwapRequests() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['oncall-swap-requests', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oncall_swap_requests')
        .select(
          'id, status, created_at, shift:shift_id ( start_time, end_time ), requested_by_user:requested_by ( full_name ), requested_to_user:requested_to ( full_name )'
        )
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as SwapRequest[]
    },
  })
}

export function useCreateSchedule() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (name: string) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('oncall_schedules').insert({ tenant_id: profile.tenantId, name })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['oncall-schedules'] }),
  })
}

export function useCreateShift(scheduleId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { userId: string; startTime: string; endTime: string }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('oncall_shifts').insert({
        tenant_id: profile.tenantId,
        schedule_id: scheduleId,
        user_id: input.userId,
        start_time: input.startTime,
        end_time: input.endTime,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oncall-upcoming', scheduleId] })
      qc.invalidateQueries({ queryKey: ['oncall-current', scheduleId] })
    },
  })
}

export function useRequestSwap() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { shiftId: string; requestedTo: string }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('oncall_swap_requests').insert({
        tenant_id: profile.tenantId,
        shift_id: input.shiftId,
        requested_by: profile.id,
        requested_to: input.requestedTo,
        status: 'pending',
        decided_at: null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['oncall-swap-requests'] }),
  })
}

export function useDecideSwap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('oncall_swap_requests').update({ status: input.status }).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oncall-swap-requests'] })
      qc.invalidateQueries({ queryKey: ['oncall-upcoming'] })
      qc.invalidateQueries({ queryKey: ['oncall-current'] })
    },
  })
}

/** Tenant'taki tüm agent/manager/admin kullanıcıları — vardiya
 * atama/değişim seçicilerinde kullanılır. */
export function useAssignableUsers() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['assignable-users', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('role', ['tenant_admin', 'manager', 'agent'])
        .order('full_name')
      if (error) throw error
      return data
    },
  })
}
