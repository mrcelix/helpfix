import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { RequestStatus } from '@/types/database'

export interface CatalogCategory {
  id: string
  name: string
  icon: string | null
  sort_order: number
}

export interface CatalogItem {
  id: string
  category_id: string | null
  name: string
  description: string | null
  icon: string | null
  estimated_cost: number | null
  estimated_days: number | null
  requires_approval: boolean
}

export interface ServiceRequestItem {
  id: string
  ref: string
  status: RequestStatus
  notes: string | null
  created_at: string
  fulfilled_at: string | null
  catalog_item: { name: string } | null
  requester: { full_name: string } | null
}

export type CatalogSavedView = 'all' | 'mine' | 'pending_approval' | 'fulfilled_this_month'

export function useCategories() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['catalog-categories', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('id, name, icon, sort_order')
        .order('sort_order')
      if (error) throw error
      return data as CatalogCategory[]
    },
  })
}

export function useCatalogItems(categoryId: string | null) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['catalog-items', profile?.tenantId, categoryId],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase
        .from('service_catalog_items')
        .select('id, category_id, name, description, icon, estimated_cost, estimated_days, requires_approval')
        .eq('is_active', true)
        .order('name')
      if (categoryId) query = query.eq('category_id', categoryId)
      const { data, error } = await query
      if (error) throw error
      return data as CatalogItem[]
    },
  })
}

export function useServiceRequests(view: CatalogSavedView) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['service-requests', view, profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase
        .from('service_requests')
        .select('id, ref, status, notes, created_at, fulfilled_at, catalog_item:catalog_item_id ( name ), requester:requester_id ( full_name )')
        .order('created_at', { ascending: false })

      if (view === 'mine' && profile) {
        query = query.eq('requester_id', profile.id)
      } else if (view === 'pending_approval') {
        query = query.eq('status', 'pending_approval')
      } else if (view === 'fulfilled_this_month') {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        query = query.eq('status', 'fulfilled').gte('fulfilled_at', startOfMonth.toISOString())
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as ServiceRequestItem[]
    },
  })
}

export function useCreateServiceRequest() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (input: { catalogItemId: string; notes: string; requiresApproval: boolean }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { data, error } = await supabase
        .from('service_requests')
        .insert({
          tenant_id: profile.tenantId,
          catalog_item_id: input.catalogItemId,
          requester_id: profile.id,
          requested_for_id: null,
          status: input.requiresApproval ? 'pending_approval' : 'approved',
          notes: input.notes || null,
          approver_id: null,
          approval_comment: null,
          fulfilled_at: null,
        })
        .select('id, ref')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-requests'] }),
  })
}

export function useUpdateServiceRequest(id: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (patch: { status: RequestStatus; approval_comment?: string }) => {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status: patch.status,
          approval_comment: patch.approval_comment ?? null,
          approver_id: profile?.id,
          fulfilled_at: patch.status === 'fulfilled' ? new Date().toISOString() : null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-requests'] }),
  })
}
