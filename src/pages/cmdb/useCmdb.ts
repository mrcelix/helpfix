import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CiType, CiStatus } from '@/types/database'

export interface CiListItem {
  id: string
  tag: string
  name: string
  ci_type: CiType
  status: CiStatus
  serial_number: string | null
  warranty_expiry: string | null
  assigned_user: { full_name: string } | null
}

export interface CiDetail extends CiListItem {
  vendor: string | null
  cost: number | null
  purchase_date: string | null
  notes: string | null
}

export type CiSavedView = 'all' | 'mine' | 'warranty_expiring' | 'unassigned'

const SELECT_LIST = `
  id, tag, name, ci_type, status, serial_number, warranty_expiry,
  assigned_user:assigned_user_id ( full_name )
`

export function useConfigurationItems(view: CiSavedView) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['cmdb', view, profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase.from('configuration_items').select(SELECT_LIST).order('created_at', { ascending: false })

      if (view === 'mine' && profile) {
        query = query.eq('assigned_user_id', profile.id)
      } else if (view === 'unassigned') {
        query = query.is('assigned_user_id', null)
      } else if (view === 'warranty_expiring') {
        const in60Days = new Date()
        in60Days.setDate(in60Days.getDate() + 60)
        query = query.lte('warranty_expiry', in60Days.toISOString().slice(0, 10)).not('warranty_expiry', 'is', null)
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as CiListItem[]
    },
  })
}

export function useCiDetail(id: string | null) {
  return useQuery({
    queryKey: ['ci', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuration_items')
        .select(`${SELECT_LIST}, vendor, cost, purchase_date, notes`)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as CiDetail
    },
  })
}

/** Bu CI'ya bağlı açık olay/problem/değişiklik sayıları — mockup'taki
 * "Açık Kayıtlar" sekmesinin gerçek, çalışan bir sürümü. */
export function useLinkedRecords(ciId: string | null) {
  return useQuery({
    queryKey: ['ci-linked-records', ciId],
    enabled: !!ciId,
    queryFn: async () => {
      const [incidents, problems, changes] = await Promise.all([
        supabase.from('incidents').select('id, ref, title, status').eq('ci_id', ciId!),
        supabase.from('problems').select('id, ref, title, status').eq('ci_id', ciId!),
        supabase.from('changes').select('id, ref, title, status').eq('ci_id', ciId!),
      ])
      if (incidents.error) throw incidents.error
      if (problems.error) throw problems.error
      if (changes.error) throw changes.error
      return {
        incidents: incidents.data ?? [],
        problems: problems.data ?? [],
        changes: changes.data ?? [],
      }
    },
  })
}

export function useCreateCi() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      name: string
      ci_type: CiType
      serial_number: string
      vendor: string
      cost: number | null
      warranty_expiry: string | null
    }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { data, error } = await supabase
        .from('configuration_items')
        .insert({
          tenant_id: profile.tenantId,
          name: input.name,
          ci_type: input.ci_type,
          status: 'active',
          serial_number: input.serial_number || null,
          assigned_user_id: null,
          vendor: input.vendor || null,
          cost: input.cost,
          purchase_date: null,
          warranty_expiry: input.warranty_expiry,
          notes: null,
        })
        .select('id, tag')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cmdb'] }),
  })
}

export function useUpdateCi(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<{ status: CiStatus; assigned_user_id: string | null; notes: string }>) => {
      const { error } = await supabase.from('configuration_items').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cmdb'] })
      qc.invalidateQueries({ queryKey: ['ci', id] })
    },
  })
}
