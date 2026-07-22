import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types/database'
import { NAV_MODULES } from '@/components/layout/nav-modules'
import { pickLang, type Lang } from '@/contexts/LangContext'

export const ROLE_LABEL: Record<UserRole, { tr: string; en: string }> = {
  tenant_admin: { tr: 'Tenant Admin', en: 'Tenant Admin' },
  manager: { tr: 'Ekip Yöneticisi', en: 'Team Manager' },
  agent: { tr: 'Teknisyen', en: 'Agent' },
  requester: { tr: 'Son Kullanıcı', en: 'Requester' },
}

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

// requester < agent < manager < tenant_admin — bir modülün min_role'üne
// karşı kullanıcının rolünü eşik olarak karşılaştırmak için.
export const ROLE_ORDER: UserRole[] = ['requester', 'agent', 'manager', 'tenant_admin']

export interface NavModuleConfig {
  isEnabled: boolean
  order: number
  minRole: UserRole | null
  customName: Partial<Record<Lang, string>> | null
  customIcon: string | null
}

/** Sidebar ve Admin > Modüller için tam menü yapılandırması — sıra,
 * role göre görünürlük eşiği, özel ad/ikon. useFeatureFlags() (sade
 * açık/kapalı haritası) App.tsx/OverviewTab.tsx'te değişmeden kalıyor;
 * bu, sadece genişletilmiş alanlara ihtiyaç duyan yerler için ayrı bir
 * sorgu. */
export function useNavConfig() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['nav-config', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_feature_flags')
        .select('module_code, is_enabled, display_order, min_role, custom_name, custom_icon')
      if (error) throw error
      const byCode = new Map((data ?? []).map((r) => [r.module_code, r]))
      const map: Record<string, NavModuleConfig> = {}
      NAV_MODULES.forEach((m, idx) => {
        const row = byCode.get(m.code)
        map[m.code] = {
          isEnabled: row?.is_enabled ?? true,
          order: row?.display_order ?? idx,
          minRole: (row?.min_role as UserRole | null) ?? null,
          customName: (row?.custom_name as Partial<Record<Lang, string>> | null) ?? null,
          customIcon: row?.custom_icon ?? null,
        }
      })
      return map
    },
  })
}

export function useUpdateNavConfig() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: {
      moduleCode: string
      order?: number
      minRole?: UserRole | null
      customName?: Partial<Record<Lang, string>> | null
      customIcon?: string | null
    }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('tenant_feature_flags').upsert(
        {
          tenant_id: profile.tenantId,
          module_code: input.moduleCode,
          ...(input.order !== undefined ? { display_order: input.order } : {}),
          ...(input.minRole !== undefined ? { min_role: input.minRole } : {}),
          ...(input.customName !== undefined ? { custom_name: input.customName } : {}),
          ...(input.customIcon !== undefined ? { custom_icon: input.customIcon } : {}),
        },
        { onConflict: 'tenant_id,module_code', ignoreDuplicates: false }
      )
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nav-config'] })
      qc.invalidateQueries({ queryKey: ['feature-flags'] })
    },
  })
}

// ------------------------------------------------------------------
// EKRAN DÜZENİ (WIDGET YERLEŞİMİ) — tenant-geneli, sadece admin yazar
// ------------------------------------------------------------------
export interface DashboardLayoutRow {
  widget_id: string
  is_visible: boolean
  x: number
  y: number
  w: number
  h: number
}

export function useDashboardLayout(surface: string) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['dashboard-layout', surface, profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_dashboard_layouts')
        .select('widget_id, is_visible, x, y, w, h')
        .eq('surface', surface)
      if (error) throw error
      return data as DashboardLayoutRow[]
    },
  })
}

export function useSaveDashboardLayout() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { surface: string; widgets: DashboardLayoutRow[] }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const rows = input.widgets.map((w) => ({
        tenant_id: profile.tenantId,
        surface: input.surface,
        widget_id: w.widget_id,
        is_visible: w.is_visible,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
      }))
      const { error } = await supabase.from('tenant_dashboard_layouts').upsert(rows, { onConflict: 'tenant_id,surface,widget_id' })
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['dashboard-layout', variables.surface] })
    },
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


// ---------------------------------------------------------------------------
// Faz 3 — AI Denetim İzi: ai_events'ten (0061) son olaylar.
// select RLS'i tenant bazlı; incidents(ref) join'i FK üzerinden gelir.
// ---------------------------------------------------------------------------

export interface AiEventRow {
  id: string
  event_type: string
  created_at: string
  incidents: { ref: string } | null
  user_profiles: { full_name: string } | null
}

export function useRecentAiEvents(limit = 25) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['ai-events-recent', profile?.tenantId, limit],
    enabled: !!profile,
    queryFn: async (): Promise<AiEventRow[]> => {
      const { data, error } = await supabase
        .from('ai_events')
        .select('id, event_type, created_at, incidents(ref), user_profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as unknown as AiEventRow[]
    },
  })
}

export const AI_EVENT_LABEL: Record<string, { tr: string; en: string }> = {
  triage_run: { tr: 'Triyaj önerisi üretildi', en: 'Triage suggestion generated' },
  triage_accepted: { tr: 'Triyaj önerisi kabul edildi', en: 'Triage suggestion accepted' },
  triage_rejected: { tr: 'Triyaj önerisi değiştirildi', en: 'Triage suggestion overridden' },
  summary_run: { tr: 'Özet üretildi', en: 'Summary generated' },
  draft_run: { tr: 'Yanıt taslağı üretildi', en: 'Reply draft generated' },
  chat_deflected: { tr: 'AI asistan çözdü (talep açılmadı)', en: 'AI assistant resolved (no ticket)' },
  chat_escalated: { tr: 'AI asistan talep açtı', en: 'AI assistant opened a ticket' },
}
