import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface ConsumableItem {
  id: string
  name: string
  category: string | null
  is_returnable: boolean
  total_quantity: number
  low_stock_threshold: number
  unit_cost: number | null
  vendor: { name: string } | null
  site: { name: string } | null
}

export function useConsumableItems() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['consumable-items', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consumable_items')
        .select('id, name, category, is_returnable, total_quantity, low_stock_threshold, unit_cost, vendor:vendor_id ( name ), site:site_id ( name )')
        .order('name')
      if (error) throw error
      return data as unknown as ConsumableItem[]
    },
  })
}

export function useConsumableOutQuantities() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['consumable-out-quantities', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('consumable_checkouts').select('consumable_id, quantity, checked_in_at')
      if (error) throw error
      const rows = data as { consumable_id: string; quantity: number; checked_in_at: string | null }[]
      const totals = new Map<string, number>()
      for (const r of rows) {
        if (r.checked_in_at === null) totals.set(r.consumable_id, (totals.get(r.consumable_id) ?? 0) + r.quantity)
      }
      return totals
    },
  })
}

export function useCreateConsumableItem() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: {
      name: string
      category: string
      isReturnable: boolean
      totalQuantity: number
      lowStockThreshold: number
      unitCost: number | null
      vendorId: string | null
      siteId: string | null
    }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('consumable_items').insert({
        tenant_id: profile.tenantId,
        name: input.name,
        category: input.category || null,
        is_returnable: input.isReturnable,
        total_quantity: input.totalQuantity,
        low_stock_threshold: input.lowStockThreshold,
        unit_cost: input.unitCost,
        vendor_id: input.vendorId,
        site_id: input.siteId,
        notes: null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consumable-items'] }),
  })
}

export interface ConsumableCheckoutRecord {
  id: string
  quantity: number
  checked_out_at: string
  checked_in_at: string | null
  user: { full_name: string } | null
}

export function useConsumableCheckouts(consumableId: string | null) {
  return useQuery({
    queryKey: ['consumable-checkouts', consumableId],
    enabled: !!consumableId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consumable_checkouts')
        .select('id, quantity, checked_out_at, checked_in_at, user:user_id ( full_name )')
        .eq('consumable_id', consumableId!)
        .order('checked_out_at', { ascending: false })
      if (error) throw error
      return data as unknown as ConsumableCheckoutRecord[]
    },
  })
}

export function useCheckoutConsumable() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { consumableId: string; userId: string; quantity: number }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('consumable_checkouts').insert({
        tenant_id: profile.tenantId,
        consumable_id: input.consumableId,
        user_id: input.userId,
        quantity: input.quantity,
        checked_out_by: profile.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consumable-checkouts'] })
      qc.invalidateQueries({ queryKey: ['consumable-out-quantities'] })
    },
  })
}

export function useCheckinConsumable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (checkoutId: string) => {
      const { error } = await supabase.from('consumable_checkouts').update({ checked_in_at: new Date().toISOString() }).eq('id', checkoutId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consumable-checkouts'] })
      qc.invalidateQueries({ queryKey: ['consumable-out-quantities'] })
    },
  })
}
