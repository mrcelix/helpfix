import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types/database'
import { NAV_MODULES } from '@/components/layout/nav-modules'
import { pickLang, type Lang } from '@/contexts/LangContext'

export interface TenantUser {
  id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  department_id: string | null
  site_id: string | null
  department: { name: string } | null
}

export interface Department {
  id: string
  name: string
  manager_id: string | null
}

export function useTenantUsers() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['admin-users', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, is_active, department_id, site_id, department:department_id ( name )')
        .order('full_name')
      if (error) throw error
      return data as unknown as TenantUser[]
    },
  })
}

/** Site ataması hassas bir alan değil (edge function/service_role
 * gerektirmez) — mevcut user_profiles_admin_write RLS politikası
 * tenant_admin'in doğrudan güncellemesine zaten izin veriyor. */
export function useUpdateUserSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { userId: string; siteId: string | null }) => {
      const { error } = await supabase.from('user_profiles').update({ site_id: input.siteId }).eq('id', input.userId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; role: UserRole }) => {
      const { error } = await supabase.from('user_profiles').update({ role: input.role }).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useToggleUserActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('user_profiles').update({ is_active: input.is_active }).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useDepartments() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['admin-departments', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('id, name, manager_id').order('name')
      if (error) throw error
      return data as Department[]
    },
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (name: string) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('departments').insert({ tenant_id: profile.tenantId, name, manager_id: null })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-departments'] }),
  })
}

/** Tenant'ın modül aç/kapa bayrakları. Bir modül için satır yoksa
 * varsayılan olarak AÇIK sayılır (0'dan 12 satır seed etmeye gerek yok). */
export function useFeatureFlags() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['feature-flags', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('tenant_feature_flags').select('module_code, is_enabled')
      if (error) throw error
      const map: Record<string, boolean> = {}
      NAV_MODULES.forEach((m) => (map[m.code] = true)) // varsayılan: hepsi açık
      data?.forEach((f) => (map[f.module_code] = f.is_enabled))
      return map
    },
  })
}

export function useToggleModule() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { moduleCode: string; isEnabled: boolean }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase
        .from('tenant_feature_flags')
        .upsert({ tenant_id: profile.tenantId, module_code: input.moduleCode, is_enabled: input.isEnabled })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature-flags'] }),
  })
}

// ------------------------------------------------------------------
// DENETİM GÜNLÜĞÜ
// ------------------------------------------------------------------
export interface AuditLogEntry {
  id: string
  action: string
  target_type: string
  target_label: string | null
  details: Record<string, unknown> | null
  created_at: string
  actor: { full_name: string } | null
}

export function useAuditLog() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['audit-log', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, action, target_type, target_label, details, created_at, actor:actor_id ( full_name )')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as unknown as AuditLogEntry[]
    },
  })
}

// ------------------------------------------------------------------
// YENİ KULLANICI OLUŞTURMA — Edge Function üzerinden
// ------------------------------------------------------------------
export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; password: string; fullName: string; role: UserRole; departmentId: string | null; siteId?: string | null }) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: input.email,
          password: input.password,
          fullName: input.fullName,
          role: input.role,
          departmentId: input.departmentId,
          siteId: input.siteId ?? null,
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

/** Rastgele, yeterince güçlü bir geçici şifre üretir — yeni kullanıcıya
 * iletmeniz için (e-posta gönderimi altyapımız yok, elle paylaşılır). */
export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$'
  let pass = ''
  for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)]
  return pass
}

// ------------------------------------------------------------------
// KULLANICI DÜZENLEME / SİLME / ŞİFRE SIFIRLAMA — Edge Function üzerinden
//
// NOT: Supabase (hiçbir düzgün auth sistemi gibi) şifreleri okunabilir
// biçimde saklamaz — yalnızca tek yönlü hash tutar. "Mevcut şifreyi
// görüntüleme" diye bir işlem YOKTUR. Yapılabilecek olan, kullanıcıya
// admin tarafından YENİ bir şifre atamaktır (aşağıdaki useResetPassword).
// ------------------------------------------------------------------
export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      fullName?: string
      email?: string
      role?: UserRole
      departmentId?: string | null
      isActive?: boolean
    }) => {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'update', ...input },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'delete', userId },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: { userId: string; newPassword: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'reset-password', userId: input.userId, newPassword: input.newPassword },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
  })
}

// ------------------------------------------------------------------
// Faz AZ — Gerçek Omnichannel: tenant'ın e-posta gelen kutusu adresi
// ------------------------------------------------------------------
export function useTenantInboundEmail() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['tenant-inbound-email', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('inbound_email').eq('id', profile!.tenantId).single()
      if (error) throw error
      return data.inbound_email as string
    },
  })
}

// ------------------------------------------------------------------
// Faz BF — TEKNİSYEN BECERİLERİ (Beceri Bazlı Otomatik Atama)
// ------------------------------------------------------------------
export interface UserSkill {
  id: string
  category_label: string
  proficiency: number
}

export function useUserSkills(userId: string) {
  return useQuery({
    queryKey: ['user-skills', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_skills').select('id, category_label, proficiency').eq('user_id', userId)
      if (error) throw error
      return data as UserSkill[]
    },
  })
}

export function useSetUserSkill() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { userId: string; categoryLabel: string; proficiency: number }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase
        .from('user_skills')
        .upsert(
          { tenant_id: profile.tenantId, user_id: input.userId, category_label: input.categoryLabel, proficiency: input.proficiency },
          { onConflict: 'tenant_id,user_id,category_label' }
        )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-skills'] }),
  })
}

export function useRemoveUserSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_skills').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-skills'] }),
  })
}

// ------------------------------------------------------------------
// AI KULLANIM KOTASI — Faz AT+1
// ------------------------------------------------------------------
export interface AiUsageBreakdown {
  action: string
  call_count: number
}

const ACTION_LABEL: Record<string, { tr: string; en: string }> = {
  'suggest-triage': { tr: 'Triyaj Önerisi', en: 'Triage Suggestion' },
  summarize: { tr: 'Özetleme', en: 'Summarize' },
  'draft-reply': { tr: 'Yanıt Taslağı', en: 'Draft Reply' },
  chat_message: { tr: 'AI Sohbet Asistanı', en: 'AI Chat Assistant' },
}

export function getActionLabel(action: string, lang: Lang): string {
  return ACTION_LABEL[action] ? pickLang(ACTION_LABEL[action], lang) : action
}

export function useAiQuota() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['ai-quota', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('ai_quota').select('monthly_limit').eq('tenant_id', profile!.tenantId).maybeSingle()
      if (error) throw error
      return data?.monthly_limit ?? 500
    },
  })
}

export function useAiUsageThisMonth() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['ai-usage-this-month', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_ai_usage_current_month', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as AiUsageBreakdown[]
    },
  })
}

export function useSetAiQuota() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (monthlyLimit: number) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase
        .from('ai_quota')
        .upsert({ tenant_id: profile.tenantId, monthly_limit: monthlyLimit, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-quota'] }),
  })
}
