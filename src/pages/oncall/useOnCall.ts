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
  requested_to: string
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
        .gt('end_time', now)
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
          'id, status, created_at, requested_to, shift:shift_id ( start_time, end_time ), requested_by_user:requested_by ( full_name ), requested_to_user:requested_to ( full_name )'
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
      if (input.status === 'approved') {
        const { data: swap, error: fetchError } = await supabase
          .from('oncall_swap_requests')
          .select('shift_id, requested_to')
          .eq('id', input.id)
          .single()
        if (fetchError) throw fetchError
        const { error: shiftError } = await supabase
          .from('oncall_shifts')
          .update({ user_id: swap.requested_to })
          .eq('id', swap.shift_id)
        if (shiftError) throw shiftError
      }
      const { error } = await supabase
        .from('oncall_swap_requests')
        .update({ status: input.status, decided_at: new Date().toISOString() })
        .eq('id', input.id)
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

export interface OnCallFairness {
  user_id: string
  full_name: string
  shift_count: number
  total_hours: number
}

export function useOnCallFairness(scheduleId: string | null) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['oncall-fairness', scheduleId],
    enabled: !!scheduleId && !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_oncall_fairness', {
        p_tenant_id: profile!.tenantId,
        p_schedule_id: scheduleId!,
      })
      if (error) throw error
      return data as OnCallFairness[]
    },
  })
}

// ------------------------------------------------------------------
// ESKALASYON ZİNCİRİ (Push → Arama → Ekip Lideri)
// ------------------------------------------------------------------
export interface EscalationStep {
  id: string
  step_order: number
  delay_minutes: number
  notify_method: 'push' | 'call' | 'team_lead'
}

export function useEscalationSteps(scheduleId: string | null) {
  return useQuery({
    queryKey: ['escalation-steps', scheduleId],
    enabled: !!scheduleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oncall_escalation_steps')
        .select('id, step_order, delay_minutes, notify_method')
        .eq('schedule_id', scheduleId!)
        .order('step_order')
      if (error) throw error
      return data as EscalationStep[]
    },
  })
}

export function useAddEscalationStep(scheduleId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { delayMinutes: number; notifyMethod: 'push' | 'call' | 'team_lead' }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { data: existing } = await supabase
        .from('oncall_escalation_steps')
        .select('step_order')
        .eq('schedule_id', scheduleId)
        .order('step_order', { ascending: false })
        .limit(1)
      const nextOrder = (existing?.[0]?.step_order ?? 0) + 1
      const { error } = await supabase.from('oncall_escalation_steps').insert({
        tenant_id: profile.tenantId,
        schedule_id: scheduleId,
        step_order: nextOrder,
        delay_minutes: input.delayMinutes,
        notify_method: input.notifyMethod,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escalation-steps', scheduleId] }),
  })
}

export function useDeleteEscalationStep(scheduleId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('oncall_escalation_steps').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escalation-steps', scheduleId] }),
  })
}
