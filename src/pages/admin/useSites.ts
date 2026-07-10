import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface Site {
  id: string
  name: string
  address: string | null
  city: string | null
  is_headquarters: boolean
}

export function useSites() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['sites', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('sites').select('id, name, address, city, is_headquarters').order('name')
      if (error) throw error
      return data as Site[]
    },
  })
}

export function useCreateSite() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { name: string; address: string; city: string; isHeadquarters: boolean }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('sites').insert({
        tenant_id: profile.tenantId,
        name: input.name,
        address: input.address || null,
        city: input.city || null,
        is_headquarters: input.isHeadquarters,
      })
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
