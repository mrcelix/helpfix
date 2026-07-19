import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface Site {
  id: string
  name: string
  address: string | null
  city: string | null
  is_headquarters: boolean
  parent_site_id: string | null
  manager_id: string | null
  integration_token: string
  manager: { full_name: string } | null
}

export function useSites() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['sites', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, address, city, is_headquarters, parent_site_id, manager_id, integration_token, manager:manager_id ( full_name )')
        .order('name')
      if (error) throw error
      return data as unknown as Site[]
    },
  })
}

export function useCreateSite() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { name: string; address: string; city: string; isHeadquarters: boolean; parentSiteId: string | null; managerId: string | null }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('sites').insert({
        tenant_id: profile.tenantId,
        name: input.name,
        address: input.address || null,
        city: input.city || null,
        is_headquarters: input.isHeadquarters,
        parent_site_id: input.parentSiteId,
        manager_id: input.managerId,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}

export function useUpdateSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      name: string
      address: string
      city: string
      isHeadquarters: boolean
      parentSiteId: string | null
      managerId: string | null
    }) => {
      const { error } = await supabase
        .from('sites')
        .update({
          name: input.name,
          address: input.address || null,
          city: input.city || null,
          is_headquarters: input.isHeadquarters,
          parent_site_id: input.parentSiteId,
          manager_id: input.managerId,
        })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}

export function useDeleteSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sites').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}

/** Bir sitenin entegrasyon token'ını yeniler — token sızmışsa/değişmesi
 * gerekiyorsa eski token'ı geçersiz kılar. */
export function useRegenerateSiteToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase.from('sites').update({ integration_token: crypto.randomUUID() }).eq('id', siteId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}
