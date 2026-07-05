import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types/database'
import { NAV_MODULES } from '@/components/layout/nav-modules'

export interface TenantUser {
  id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
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
        .select('id, full_name, email, role, is_active, department:department_id ( name )')
        .order('full_name')
      if (error) throw error
      return data as unknown as TenantUser[]
    },
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
