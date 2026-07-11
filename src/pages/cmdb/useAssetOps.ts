import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CiType } from '@/types/database'
import type { FormFieldSchema } from '@/components/ui/DynamicFields'

export interface AssetModel {
  id: string
  name: string
  manufacturer: string | null
  ci_type: CiType
}

export function useAssetModels() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['asset-models', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('asset_models').select('id, name, manufacturer, ci_type').order('name')
      if (error) throw error
      return data as AssetModel[]
    },
  })
}

export function useCreateAssetModel() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { name: string; manufacturer: string; ciType: CiType }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { data, error } = await supabase
        .from('asset_models')
        .insert({ tenant_id: profile.tenantId, name: input.name, manufacturer: input.manufacturer || null, ci_type: input.ciType, notes: null })
        .select('id, name, manufacturer, ci_type')
        .single()
      if (error) throw error
      return data as AssetModel
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asset-models'] }),
  })
}

export interface CheckoutRecord {
  id: string
  checked_out_at: string
  checked_in_at: string | null
  notes: string | null
  checked_out_to: { full_name: string } | null
  checked_out_by: { full_name: string } | null
  checked_in_by: { full_name: string } | null
}

export function useCiCheckoutHistory(ciId: string | null) {
  return useQuery({
    queryKey: ['ci-checkout-history', ciId],
    enabled: !!ciId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ci_checkout_history')
        .select(
          'id, checked_out_at, checked_in_at, notes, checked_out_to:checked_out_to ( full_name ), checked_out_by:checked_out_by ( full_name ), checked_in_by:checked_in_by ( full_name )'
        )
        .eq('ci_id', ciId!)
        .order('checked_out_at', { ascending: false })
      if (error) throw error
      return data as unknown as CheckoutRecord[]
    },
  })
}

export function useCheckoutCi() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { ciId: string; userId: string; notes?: string }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error: historyError } = await supabase.from('ci_checkout_history').insert({
        tenant_id: profile.tenantId,
        ci_id: input.ciId,
        checked_out_to: input.userId,
        checked_out_by: profile.id,
        notes: input.notes ?? null,
      })
      if (historyError) throw historyError
      const { error: ciError } = await supabase.from('configuration_items').update({ assigned_user_id: input.userId }).eq('id', input.ciId)
      if (ciError) throw ciError
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ci-checkout-history'] })
      qc.invalidateQueries({ queryKey: ['ci'] })
      qc.invalidateQueries({ queryKey: ['cmdb'] })
    },
  })
}

export function useCheckinCi() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { ciId: string; openHistoryId: string }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error: historyError } = await supabase
        .from('ci_checkout_history')
        .update({ checked_in_at: new Date().toISOString(), checked_in_by: profile.id })
        .eq('id', input.openHistoryId)
      if (historyError) throw historyError
      const { error: ciError } = await supabase.from('configuration_items').update({ assigned_user_id: null }).eq('id', input.ciId)
      if (ciError) throw ciError
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ci-checkout-history'] })
      qc.invalidateQueries({ queryKey: ['ci'] })
      qc.invalidateQueries({ queryKey: ['cmdb'] })
    },
  })
}

export function useCiTypeFields(ciType: CiType | null) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['ci-type-fields', profile?.tenantId, ciType],
    enabled: !!profile && !!ciType,
    queryFn: async () => {
      const { data, error } = await supabase.from('ci_type_fields').select('field_schema').eq('ci_type', ciType!).maybeSingle()
      if (error) throw error
      return (data?.field_schema as unknown as FormFieldSchema[]) ?? []
    },
  })
}

export function useAllCiTypeFields() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['all-ci-type-fields', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('ci_type_fields').select('ci_type, field_schema')
      if (error) throw error
      return data as { ci_type: CiType; field_schema: unknown }[]
    },
  })
}

export function useSetCiTypeFields() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { ciType: CiType; fields: FormFieldSchema[] }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase
        .from('ci_type_fields')
        .upsert(
          { tenant_id: profile.tenantId, ci_type: input.ciType, field_schema: input.fields, updated_at: new Date().toISOString() },
          { onConflict: 'tenant_id,ci_type' }
        )
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ci-type-fields'] })
      qc.invalidateQueries({ queryKey: ['all-ci-type-fields'] })
    },
  })
}
