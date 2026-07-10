import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type LicenseType = 'subscription' | 'perpetual' | 'oem' | 'open_source'

export interface SoftwareLicense {
  id: string
  name: string
  license_type: LicenseType
  total_seats: number
  cost_per_seat: number | null
  currency: string
  renewal_date: string | null
  vendor: { name: string } | null
}

export interface LicenseAssignment {
  id: string
  assigned_at: string
  user: { full_name: string } | null
  ci: { name: string; tag: string } | null
}

export function useSoftwareLicenses() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['software-licenses', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('software_licenses')
        .select('id, name, license_type, total_seats, cost_per_seat, currency, renewal_date, vendor:vendor_id ( name )')
        .order('name')
      if (error) throw error
      return data as unknown as SoftwareLicense[]
    },
  })
}

/** Tüm lisansların kullanılan koltuk sayısını TEK sorguda getirir
 * (liste görünümünde N+1 sorgu yapmamak için). */
export function useLicenseSeatUsage() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['license-seat-usage', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('software_license_assignments').select('license_id')
      if (error) throw error
      const counts = new Map<string, number>()
      ;(data as { license_id: string }[]).forEach((r) => counts.set(r.license_id, (counts.get(r.license_id) ?? 0) + 1))
      return counts
    },
  })
}

export function useLicenseAssignments(licenseId: string | null) {
  return useQuery({
    queryKey: ['license-assignments', licenseId],
    enabled: !!licenseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('software_license_assignments')
        .select('id, assigned_at, user:user_id ( full_name ), ci:ci_id ( name, tag )')
        .eq('license_id', licenseId!)
        .order('assigned_at', { ascending: false })
      if (error) throw error
      return data as unknown as LicenseAssignment[]
    },
  })
}

export function useCreateSoftwareLicense() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { name: string; vendorId: string | null; licenseType: LicenseType; totalSeats: number; costPerSeat: number | null; renewalDate: string | null }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('software_licenses').insert({
        tenant_id: profile.tenantId,
        name: input.name,
        vendor_id: input.vendorId,
        license_type: input.licenseType,
        total_seats: input.totalSeats,
        cost_per_seat: input.costPerSeat,
        currency: 'TRY',
        renewal_date: input.renewalDate,
        contract_id: null,
        notes: null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['software-licenses'] }),
  })
}

export function useAssignLicenseSeat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { licenseId: string; userId: string | null; ciId: string | null }) => {
      const { error } = await supabase.from('software_license_assignments').insert({
        license_id: input.licenseId,
        user_id: input.userId,
        ci_id: input.ciId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['license-seat-usage'] })
      qc.invalidateQueries({ queryKey: ['license-assignments'] })
    },
  })
}

export function useRemoveLicenseSeat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('software_license_assignments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['license-seat-usage'] })
      qc.invalidateQueries({ queryKey: ['license-assignments'] })
    },
  })
}
