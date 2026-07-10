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

export interface FormFieldSchema {
  key: string
  label: string
  type: 'select' | 'text'
  options?: string[]
  showIf?: { field: string; equals: string }
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
  form_schema: { fields: FormFieldSchema[] } | null
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
        .select('id, category_id, name, description, icon, estimated_cost, estimated_days, requires_approval, form_schema')
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
    mutationFn: async (input: {
      catalogItemId: string
      notes: string
      requiresApproval: boolean
      formData?: Record<string, string>
    }) => {
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
          form_data: input.formData ?? null,
          bundle_request_batch_id: null,
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

// ------------------------------------------------------------------
// Faz BD — ÇOK KADEMELİ ONAY ZİNCİRİ
// ------------------------------------------------------------------
export type RequestApproverType = 'department_manager' | 'tenant_admin' | 'specific_user'

export interface RequestApprovalChainStep {
  type: RequestApproverType
  approver_id?: string
}

export interface RequestApprovalStage {
  id: string
  stage: number
  approver_type: RequestApproverType
  status: 'pending' | 'approved' | 'rejected'
  comment: string | null
  decided_at: string | null
  approver: { full_name: string } | null
}

const APPROVER_TYPE_LABEL: Record<RequestApproverType, { tr: string; en: string }> = {
  department_manager: { tr: 'Departman Yöneticisi', en: 'Department Manager' },
  tenant_admin: { tr: 'Tenant Admin', en: 'Tenant Admin' },
  specific_user: { tr: 'Belirli Kişi', en: 'Specific Person' },
}

export function approverTypeLabel(type: RequestApproverType, lang: 'tr' | 'en'): string {
  return APPROVER_TYPE_LABEL[type][lang]
}

export function useRequestApprovals(requestId: string | null) {
  return useQuery({
    queryKey: ['request-approvals', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_approvals')
        .select('id, stage, approver_type, status, comment, decided_at, approver:approver_id ( full_name )')
        .eq('request_id', requestId!)
        .order('stage')
      if (error) throw error
      return data as unknown as RequestApprovalStage[]
    },
  })
}

/** Bekleyen onaylı taleplerde her birinin GÜNCEL (bekleyen) aşamasını
 * tek sorguda getirir — liste görünümünde N+1 sorgu yapmamak için. */
export function useCurrentApprovalStages(requestIds: string[]) {
  return useQuery({
    queryKey: ['current-approval-stages', requestIds.join(',')],
    enabled: requestIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_approvals')
        .select('id, request_id, stage, approver_type')
        .in('request_id', requestIds)
        .eq('status', 'pending')
      if (error) throw error
      return data as { id: string; request_id: string; stage: number; approver_type: RequestApproverType }[]
    },
  })
}

/** Bir onay aşamasını onaylar/reddeder. Onaylanırsa ve zincirde sıradaki
 * aşama varsa onu oluşturur; yoksa talebi 'approved' yapar. Reddedilirse
 * talep hemen 'rejected' olur. (change_approvals ile aynı istemci taraflı
 * orkestrasyon deseni.) */
export function useDecideRequestApproval(requestId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (input: { approvalId: string; stage: number; decision: 'approved' | 'rejected'; comment?: string }) => {
      const { error } = await supabase
        .from('request_approvals')
        .update({
          status: input.decision,
          approver_id: profile?.id,
          comment: input.comment ?? null,
          decided_at: new Date().toISOString(),
        })
        .eq('id', input.approvalId)
      if (error) throw error

      if (input.decision === 'rejected') {
        await supabase
          .from('service_requests')
          .update({ status: 'rejected', approver_id: profile?.id, approval_comment: input.comment ?? null })
          .eq('id', requestId)
        return
      }

      const { data: request, error: reqError } = await supabase
        .from('service_requests')
        .select('catalog_item_id')
        .eq('id', requestId)
        .single()
      if (reqError) throw reqError

      const { data: item, error: itemError } = await supabase
        .from('service_catalog_items')
        .select('approval_chain')
        .eq('id', request.catalog_item_id)
        .single()
      if (itemError) throw itemError

      const chain = (item.approval_chain as unknown as RequestApprovalChainStep[]) ?? []
      const nextStepIndex = input.stage // 0-indeksli dizide sıradaki eleman

      if (chain.length > nextStepIndex) {
        const next = chain[nextStepIndex]
        const { error: insertError } = await supabase.from('request_approvals').insert({
          request_id: requestId,
          stage: input.stage + 1,
          approver_type: next.type,
          approver_id: next.type === 'specific_user' ? next.approver_id ?? null : null,
        })
        if (insertError) throw insertError
      } else {
        await supabase
          .from('service_requests')
          .update({ status: 'approved', approver_id: profile?.id, approval_comment: input.comment ?? null })
          .eq('id', requestId)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-requests'] })
      qc.invalidateQueries({ queryKey: ['request-approvals', requestId] })
      qc.invalidateQueries({ queryKey: ['current-approval-stages'] })
    },
  })
}

// ------------------------------------------------------------------
// HİZMET PAKETLERİ (Bundles) — örn. "Yeni İşe Alım Paketi"
// ------------------------------------------------------------------
export interface ServiceBundle {
  id: string
  name: string
  description: string | null
}

export function useBundles() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['catalog-bundles', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_bundles')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as ServiceBundle[]
    },
  })
}

export function useBundleItems(bundleId: string | null) {
  return useQuery({
    queryKey: ['bundle-items', bundleId],
    enabled: !!bundleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_bundle_items')
        .select('catalog_item_id, catalog_item:catalog_item_id ( id, name, requires_approval )')
        .eq('bundle_id', bundleId!)
      if (error) throw error
      return data as unknown as { catalog_item_id: string; catalog_item: { id: string; name: string; requires_approval: boolean } }[]
    },
  })
}

/** Bir paketi talep etmek, pakete dahil her hizmet için ayrı bir
 * service_request satırı oluşturur — hepsi aynı batch id ile bağlanır. */
export function useRequestBundle() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (bundleId: string) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { data: items, error: itemsError } = await supabase
        .from('service_bundle_items')
        .select('catalog_item_id, catalog_item:catalog_item_id ( requires_approval )')
        .eq('bundle_id', bundleId)
      if (itemsError) throw itemsError
      if (!items?.length) throw new Error('Bu pakette hizmet yok')

      const batchId = crypto.randomUUID()
      const rows = (items as unknown as { catalog_item_id: string; catalog_item: { requires_approval: boolean } }[]).map(
        (i) => ({
          tenant_id: profile.tenantId,
          catalog_item_id: i.catalog_item_id,
          requester_id: profile.id,
          requested_for_id: null,
          status: i.catalog_item.requires_approval ? ('pending_approval' as const) : ('approved' as const),
          notes: null,
          approver_id: null,
          approval_comment: null,
          form_data: null,
          bundle_request_batch_id: batchId,
          fulfilled_at: null,
        })
      )
      const { error } = await supabase.from('service_requests').insert(rows)
      if (error) throw error
      return { count: rows.length }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-requests'] }),
  })
}

// ------------------------------------------------------------------
// KATALOĞ YÖNETİMİ (Tenant Admin için) — kategori/öğe CRUD
// ------------------------------------------------------------------
export function useCreateCategory() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (name: string) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('service_categories').insert({
        tenant_id: profile.tenantId,
        name,
        icon: null,
        sort_order: Date.now(),
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-categories'] }),
  })
}

export function useAllCatalogItemsAdmin() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['catalog-items-admin', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_catalog_items')
        .select('id, name, category_id, is_active, requires_approval, estimated_cost, estimated_days, approval_chain, category:category_id ( name )')
        .order('name')
      if (error) throw error
      return data as unknown as {
        id: string
        name: string
        category_id: string | null
        is_active: boolean
        requires_approval: boolean
        estimated_cost: number | null
        estimated_days: number | null
        approval_chain: RequestApprovalChainStep[]
        category: { name: string } | null
      }[]
    },
  })
}

export function useUpdateCatalogItemApprovalChain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; chain: RequestApprovalChainStep[] }) => {
      const { error } = await supabase.from('service_catalog_items').update({ approval_chain: input.chain }).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-items-admin'] }),
  })
}

export function useCreateCatalogItem() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: {
      name: string
      description: string
      categoryId: string | null
      estimatedCost: number | null
      estimatedDays: number | null
      requiresApproval: boolean
    }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('service_catalog_items').insert({
        tenant_id: profile.tenantId,
        category_id: input.categoryId,
        name: input.name,
        description: input.description || null,
        icon: null,
        estimated_cost: input.estimatedCost,
        estimated_days: input.estimatedDays,
        requires_approval: input.requiresApproval,
        approval_threshold: null,
        is_active: true,
        form_schema: null,
        approval_chain: [],
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-items-admin'] })
      qc.invalidateQueries({ queryKey: ['catalog-items'] })
    },
  })
}

export function useToggleCatalogItemActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('service_catalog_items').update({ is_active: input.isActive }).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog-items-admin'] })
      qc.invalidateQueries({ queryKey: ['catalog-items'] })
    },
  })
}
