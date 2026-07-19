import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Priority } from '@/types/database'

export interface SlaPolicy {
  id: string
  name: string
  priority: Priority
  category: string | null
  site: { name: string } | null
  response_time_minutes: number
  resolution_time_minutes: number
  escalation_warning_percent: number
  business_hours_only: boolean
  tier: 'sla' | 'ola' | 'uc'
  is_active: boolean
}

export interface MonitoredIncident {
  id: string
  ref: string
  title: string
  priority: Priority
  sla_due_at: string | null
  sla_policy_id: string | null
  created_at: string
}

export function usePolicies() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['sla-policies', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_policies')
        .select('id, name, priority, category, site:site_id ( name ), response_time_minutes, resolution_time_minutes, escalation_warning_percent, business_hours_only, tier, is_active')
        .order('priority')
      if (error) throw error
      return data as SlaPolicy[]
    },
  })
}

export function useCreatePolicy() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: {
      name: string
      priority: Priority
      category: string | null
      site_id?: string | null
      response_time_minutes: number
      resolution_time_minutes: number
      businessHoursOnly: boolean
      tier: 'sla' | 'ola' | 'uc'
    }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('sla_policies').insert({
        tenant_id: profile.tenantId,
        name: input.name,
        priority: input.priority,
        category: input.category,
        site_id: input.site_id ?? null,
        response_time_minutes: input.response_time_minutes,
        resolution_time_minutes: input.resolution_time_minutes,
        escalation_warning_percent: 80,
        business_hours_only: input.businessHoursOnly,
        tier: input.tier,
        is_active: true,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sla-policies'] }),
  })
}

export function useTogglePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('sla_policies').update({ is_active: input.is_active }).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sla-policies'] }),
  })
}

/** Açık ve sla_due_at'i olan tüm olayları çeker; risk/ihlal durumu
 * istemci tarafında (saat bazlı) hesaplanır ki canlı geri sayım
 * çalışsın. */
export function useMonitoredIncidents() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['sla-monitored-incidents', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, ref, title, priority, sla_due_at, sla_policy_id, created_at')
        .not('sla_due_at', 'is', null)
        .not('status', 'in', '(resolved,closed,merged,on_hold)')
        .order('sla_due_at', { ascending: true })
      if (error) throw error
      return data as MonitoredIncident[]
    },
    refetchInterval: 30_000, // 30 saniyede bir tazele — countdown'lar canlı kalsın
  })
}

// ------------------------------------------------------------------
// ESKALASYON MATRİSİ
// ------------------------------------------------------------------
export interface EscalationLevel {
  id: string
  sla_policy_id: string
  level: number
  trigger_percent: number
  notify_role: 'agent' | 'manager' | 'tenant_admin'
}

export function useEscalationLevels(policyId: string | null) {
  return useQuery({
    queryKey: ['escalation-levels', policyId],
    enabled: !!policyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_escalation_levels')
        .select('id, sla_policy_id, level, trigger_percent, notify_role')
        .eq('sla_policy_id', policyId!)
        .order('level')
      if (error) throw error
      return data as EscalationLevel[]
    },
  })
}

/** Tüm politikaların eskalasyon seviyeleri — İzleme ekranında her
 * olayın hangi seviyeye ulaştığını hesaplamak için tek sorguda çekilir. */
export function useAllEscalationLevels() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['all-escalation-levels', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_escalation_levels')
        .select('id, sla_policy_id, level, trigger_percent, notify_role')
        .order('level')
      if (error) throw error
      return data as EscalationLevel[]
    },
  })
}

export function useCreateEscalationLevel(policyId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { level: number; triggerPercent: number; notifyRole: 'agent' | 'manager' | 'tenant_admin' }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('sla_escalation_levels').insert({
        tenant_id: profile.tenantId,
        sla_policy_id: policyId,
        level: input.level,
        trigger_percent: input.triggerPercent,
        notify_role: input.notifyRole,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escalation-levels', policyId] })
      qc.invalidateQueries({ queryKey: ['all-escalation-levels'] })
    },
  })
}

export function useDeleteEscalationLevel(policyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sla_escalation_levels').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escalation-levels', policyId] })
      qc.invalidateQueries({ queryKey: ['all-escalation-levels'] })
    },
  })
}

/** Bir olayın elapsed % değerine göre hangi eskalasyon seviyesine
 * ulaştığını hesaplar — gerçek zamanlı, sunucu tarafı gerektirmez. */
export function computeTriggeredLevel(
  incident: MonitoredIncident,
  levelsByPolicy: EscalationLevel[]
): EscalationLevel | null {
  if (!incident.sla_due_at || !incident.sla_policy_id) return null
  const levels = levelsByPolicy.filter((l) => l.sla_policy_id === incident.sla_policy_id)
  if (!levels.length) return null

  const created = new Date(incident.created_at).getTime()
  const due = new Date(incident.sla_due_at).getTime()
  const totalMs = due - created
  if (totalMs <= 0) return null

  const elapsedPercent = ((Date.now() - created) / totalMs) * 100

  // En yüksek tetiklenen seviyeyi bul (trigger_percent <= elapsedPercent olanlar arasında en büyüğü)
  const triggered = levels.filter((l) => l.trigger_percent <= elapsedPercent).sort((a, b) => b.trigger_percent - a.trigger_percent)
  return triggered[0] ?? null
}

// ------------------------------------------------------------------
// İŞ TAKVİMİ — mesai saatleri (Faz AS)
// day_of_week: 0=Pazar … 6=Cumartesi (Postgres extract(dow) ile aynı)
// ------------------------------------------------------------------
export interface BusinessHourRow {
  id: string
  day_of_week: number
  start_time: string // "09:00:00"
  end_time: string
}

export function useBusinessHours(siteId: string | null) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['business-hours', profile?.tenantId, siteId],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase.from('business_hours').select('id, day_of_week, start_time, end_time').order('day_of_week')
      q = siteId ? q.eq('site_id', siteId) : q.is('site_id', null)
      const { data, error } = await q
      if (error) throw error
      return data as BusinessHourRow[]
    },
  })
}

/** Bir gün için mesai penceresini oluşturur/günceller. NOT: business_hours
 * artık site_id'yi de içeren bir expression (coalesce) tabanlı benzersiz
 * index kullanıyor — PostgREST'in .upsert(onConflict:) sütun listesi
 * eşleştirmesi expression index'lerle çalışmadığı için burada güvenli bir
 * "önce sil, sonra ekle" deseni kullanılıyor. */
export function useSetBusinessDay() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { dayOfWeek: number; startTime: string; endTime: string; siteId: string | null }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      let del = supabase.from('business_hours').delete().eq('tenant_id', profile.tenantId).eq('day_of_week', input.dayOfWeek)
      del = input.siteId ? del.eq('site_id', input.siteId) : del.is('site_id', null)
      const { error: deleteError } = await del
      if (deleteError) throw deleteError

      const { error: insertError } = await supabase.from('business_hours').insert({
        tenant_id: profile.tenantId,
        day_of_week: input.dayOfWeek,
        start_time: input.startTime,
        end_time: input.endTime,
        site_id: input.siteId,
      })
      if (insertError) throw insertError
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-hours'] }),
  })
}

/** Bir günü tamamen kapalı yapar (satırı siler — mesai tanımlı olmayan
 * günler SLA hesaplamasında otomatik olarak "kapalı gün" sayılır). */
export function useCloseBusinessDay() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { dayOfWeek: number; siteId: string | null }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      let q = supabase.from('business_hours').delete().eq('tenant_id', profile.tenantId).eq('day_of_week', input.dayOfWeek)
      q = input.siteId ? q.eq('site_id', input.siteId) : q.is('site_id', null)
      const { error } = await q
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-hours'] }),
  })
}

// ------------------------------------------------------------------
// TATİL GÜNLERİ (resmi + dini — Diyanet takviminden elle girilir)
// ------------------------------------------------------------------
export interface TenantHoliday {
  id: string
  holiday_date: string // "2026-04-20"
  name: string
}

export function useHolidays() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['tenant-holidays', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('tenant_holidays').select('id, holiday_date, name').order('holiday_date')
      if (error) throw error
      return data as TenantHoliday[]
    },
  })
}

export function useCreateHoliday() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { date: string; name: string }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('tenant_holidays').insert({ tenant_id: profile.tenantId, holiday_date: input.date, name: input.name })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-holidays'] }),
  })
}

export function useDeleteHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tenant_holidays').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-holidays'] }),
  })
}
