import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// ------------------------------------------------------------------
// TEDARİKÇİLER
// ------------------------------------------------------------------
export interface Vendor {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
}

export function useVendors() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['vendors', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('vendors').select('id, name, contact_name, contact_email, contact_phone, notes').order('name')
      if (error) throw error
      return data as Vendor[]
    },
  })
}

export function useCreateVendor() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { name: string; contactName?: string; contactEmail?: string; contactPhone?: string }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('vendors').insert({
        tenant_id: profile.tenantId,
        name: input.name,
        contact_name: input.contactName || null,
        contact_email: input.contactEmail || null,
        contact_phone: input.contactPhone || null,
        notes: null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  })
}

// ------------------------------------------------------------------
// SÖZLEŞMELER
// ------------------------------------------------------------------
export type ContractType = 'service' | 'license' | 'maintenance' | 'lease' | 'other'

export interface ContractItem {
  id: string
  ref: string
  name: string
  contract_type: ContractType
  start_date: string
  end_date: string
  cost: number | null
  currency: string
  auto_renew: boolean
  renewal_reminder_days: number
  vendor: { name: string } | null
  owner: { full_name: string } | null
}

export type ContractHealthStatus = 'active' | 'expiring_soon' | 'expired'

export function contractHealth(c: { end_date: string; renewal_reminder_days: number }): ContractHealthStatus {
  const daysLeft = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return 'expired'
  if (daysLeft <= c.renewal_reminder_days) return 'expiring_soon'
  return 'active'
}

export function useContracts() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['contracts', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, ref, name, contract_type, start_date, end_date, cost, currency, auto_renew, renewal_reminder_days, vendor:vendor_id ( name ), owner:owner_id ( full_name )')
        .order('end_date')
      if (error) throw error
      return data as unknown as ContractItem[]
    },
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: {
      name: string
      contractType: ContractType
      vendorId: string | null
      startDate: string
      endDate: string
      cost: number | null
      autoRenew: boolean
      renewalReminderDays: number
    }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('contracts').insert({
        tenant_id: profile.tenantId,
        vendor_id: input.vendorId,
        name: input.name,
        contract_type: input.contractType,
        start_date: input.startDate,
        end_date: input.endDate,
        cost: input.cost,
        currency: 'TRY',
        auto_renew: input.autoRenew,
        renewal_reminder_days: input.renewalReminderDays,
        notes: null,
        owner_id: profile.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
}

// ------------------------------------------------------------------
// SATIN ALMA SİPARİŞLERİ (PO)
// ------------------------------------------------------------------
export type PoStatus = 'draft' | 'pending_approval' | 'approved' | 'ordered' | 'received' | 'cancelled'

export const PO_STATUS_LABEL: Record<PoStatus, { tr: string; en: string }> = {
  draft: { tr: 'Taslak', en: 'Draft' },
  pending_approval: { tr: 'Onay Bekliyor', en: 'Pending Approval' },
  approved: { tr: 'Onaylandı', en: 'Approved' },
  ordered: { tr: 'Sipariş Verildi', en: 'Ordered' },
  received: { tr: 'Teslim Alındı', en: 'Received' },
  cancelled: { tr: 'İptal Edildi', en: 'Cancelled' },
}

export const PO_STATUS_FLOW: PoStatus[] = ['draft', 'pending_approval', 'approved', 'ordered', 'received']

export interface PurchaseOrderItem {
  id: string
  ref: string
  title: string
  status: PoStatus
  total_cost: number
  currency: string
  expected_delivery_date: string | null
  created_at: string
  vendor: { name: string } | null
  requester: { full_name: string } | null
}

export function usePurchaseOrders() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['purchase-orders', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, ref, title, status, total_cost, currency, expected_delivery_date, created_at, vendor:vendor_id ( name ), requester:requested_by ( full_name )')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as PurchaseOrderItem[]
    },
  })
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { title: string; vendorId: string | null; totalCost: number; expectedDeliveryDate: string | null; notes: string }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('purchase_orders').insert({
        tenant_id: profile.tenantId,
        vendor_id: input.vendorId,
        title: input.title,
        status: 'draft',
        total_cost: input.totalCost,
        currency: 'TRY',
        requested_by: profile.id,
        approved_by: null,
        service_request_id: null,
        expected_delivery_date: input.expectedDeliveryDate,
        ordered_at: null,
        received_at: null,
        notes: input.notes || null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  })
}

export function useUpdatePoStatus() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { id: string; status: PoStatus }) => {
      const patch: { status: PoStatus; approved_by?: string; ordered_at?: string; received_at?: string } = { status: input.status }
      if (input.status === 'approved' && profile?.id) patch.approved_by = profile.id
      if (input.status === 'ordered') patch.ordered_at = new Date().toISOString()
      if (input.status === 'received') patch.received_at = new Date().toISOString()
      const { error } = await supabase.from('purchase_orders').update(patch).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  })
}
