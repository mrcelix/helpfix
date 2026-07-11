import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ChangeStatus, ChangeType, ApprovalType, PirOutcome } from '@/types/database'

export interface ChangeListItem {
  id: string
  ref: string
  title: string
  change_type: ChangeType
  status: ChangeStatus
  risk_score: number
  category: string | null
  scheduled_start: string | null
  created_at: string
  requester: { full_name: string } | null
}

export interface ChangeDetail extends ChangeListItem {
  description: string | null
  rollback_plan: string | null
  pir_outcome: PirOutcome | null
  pir_notes: string | null
  implementer: { full_name: string } | null
  ci_id: string | null
  ci: { name: string; tag: string } | null
}

export interface ChangeApproval {
  id: string
  approval_type: ApprovalType
  status: 'pending' | 'approved' | 'rejected'
  comment: string | null
  decided_at: string | null
  approver: { full_name: string } | null
}

export type ChangeSavedView = 'all' | 'my_approvals' | 'scheduled' | 'high_risk'

const SELECT_LIST = `
  id, ref, title, change_type, status, risk_score, category, scheduled_start, created_at,
  requester:requester_id ( full_name )
`

/** Bir probleme bağlı değişiklikler — Faz BT Problem → Değişiklik köprüsü. */
export function useLinkedChanges(problemId: string | null) {
  return useQuery({
    queryKey: ['linked-changes', problemId],
    enabled: !!problemId,
    queryFn: async () => {
      const { data, error } = await supabase.from('changes').select(SELECT_LIST).eq('problem_id', problemId!).order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as ChangeListItem[]
    },
  })
}

export function useChanges(view: ChangeSavedView) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['changes', view, profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      let query = supabase.from('changes').select(SELECT_LIST).order('created_at', { ascending: false })

      if (view === 'scheduled') {
        query = query.not('scheduled_start', 'is', null).in('status', ['approved', 'scheduled'])
      } else if (view === 'high_risk') {
        query = query.gte('risk_score', 60)
      } else if (view === 'my_approvals') {
        // Bekleyen onay satırı olan değişiklikleri bul (önceden bu filtre
        // hiç uygulanmıyordu — sekme yanıltıcı şekilde TÜM değişiklikleri
        // gösteriyordu, bkz. Faz BQ düzeltmesi).
        const { data: pending, error: pendingError } = await supabase.from('change_approvals').select('change_id').eq('status', 'pending')
        if (pendingError) throw pendingError
        const ids = Array.from(new Set((pending ?? []).map((r) => r.change_id)))
        if (!ids.length) return []
        query = query.in('id', ids)
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as ChangeListItem[]
    },
  })
}

/** Onayımı bekleyen değişiklikler — kendi profil id'me atanmış pending onay satırı olanlar. */
export function useMyPendingApprovals() {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['my-pending-approvals', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_approvals')
        .select(`id, approval_type, change:change_id ( ${SELECT_LIST} )`)
        .eq('status', 'pending')
      if (error) throw error
      return data as unknown as { id: string; approval_type: ApprovalType; change: ChangeListItem }[]
    },
  })
}

export function useChangeDetail(id: string | null) {
  return useQuery({
    queryKey: ['change', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('changes')
        .select(`${SELECT_LIST}, description, rollback_plan, pir_outcome, pir_notes, implementer:implementer_id ( full_name ), ci_id, ci:ci_id ( name, tag )`)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as ChangeDetail
    },
  })
}

export function useChangeApprovals(changeId: string | null) {
  return useQuery({
    queryKey: ['change-approvals', changeId],
    enabled: !!changeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_approvals')
        .select('id, approval_type, status, comment, decided_at, approver:approver_id ( full_name )')
        .eq('change_id', changeId!)
      if (error) throw error
      return data as unknown as ChangeApproval[]
    },
  })
}

export function useChangeTimeline(changeId: string | null) {
  return useQuery({
    queryKey: ['change-timeline', changeId],
    enabled: !!changeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_timeline')
        .select('id, event_type, created_at, actor:actor_id ( full_name )')
        .eq('change_id', changeId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as { id: string; event_type: string; created_at: string; actor: { full_name: string } | null }[]
    },
  })
}

export function useCreateChange() {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      title: string
      description: string
      change_type: ChangeType
      risk_score: number
      category: string | null
      rollbackPlan?: string | null
      businessServiceId?: string | null
      problemId?: string | null
    }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { data, error } = await supabase
        .from('changes')
        .insert({
          tenant_id: profile.tenantId,
          title: input.title,
          description: input.description,
          change_type: input.change_type,
          risk_score: input.risk_score,
          category: input.category,
          status: 'draft',
          requester_id: profile.id,
          implementer_id: null,
          scheduled_start: null,
          scheduled_end: null,
          actual_start: null,
          actual_end: null,
          rollback_plan: input.rollbackPlan ?? null,
          ci_id: null,
          business_service_id: input.businessServiceId ?? null,
          problem_id: input.problemId ?? null,
          pir_outcome: null,
          pir_notes: null,
          closed_at: null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['changes'] }),
  })
}

export interface FreezeWindow {
  id: string
  name: string
  start_date: string
  end_date: string
  reason: string | null
}

export function useFreezeWindows() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['freeze-windows', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_freeze_windows')
        .select('id, name, start_date, end_date, reason')
        .order('start_date')
      if (error) throw error
      return data as FreezeWindow[]
    },
  })
}

export function useCreateFreezeWindow() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { name: string; startDate: string; endDate: string; reason: string }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('change_freeze_windows').insert({
        tenant_id: profile.tenantId,
        name: input.name,
        start_date: input.startDate,
        end_date: input.endDate,
        reason: input.reason || null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['freeze-windows'] }),
  })
}

export function useDeleteFreezeWindow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('change_freeze_windows').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['freeze-windows'] }),
  })
}

/** Verilen tarih aralığı bir dondurma penceresiyle çakışıyor mu? */
export function useFreezeConflict(scheduledStart: string | null) {
  const { data: windows } = useFreezeWindows()
  if (!scheduledStart || !windows) return null
  const target = new Date(scheduledStart).getTime()
  return windows.find((w) => target >= new Date(w.start_date).getTime() && target <= new Date(w.end_date).getTime()) ?? null
}

export interface ConnectedCi {
  id: string
  name: string
  tag: string
}

/** Blast radius: bir değişikliğe bağlı CI + ona doğrudan bağlı diğer CI'lar. */
export function useBlastRadius(ciId: string | null) {
  return useQuery({
    queryKey: ['blast-radius', ciId],
    enabled: !!ciId,
    queryFn: async () => {
      const { data: rels, error } = await supabase
        .from('ci_relationships')
        .select('source_ci_id, target_ci_id, relationship_type')
        .or(`source_ci_id.eq.${ciId},target_ci_id.eq.${ciId}`)
      if (error) throw error

      const connectedIds = new Set<string>()
      rels?.forEach((r) => {
        connectedIds.add(r.source_ci_id === ciId ? r.target_ci_id : r.source_ci_id)
      })
      if (connectedIds.size === 0) return []

      const { data: cis, error: ciError } = await supabase
        .from('configuration_items')
        .select('id, name, tag')
        .in('id', Array.from(connectedIds))
      if (ciError) throw ciError
      return cis as ConnectedCi[]
    },
  })
}

// ------------------------------------------------------------------
// Faz BG — DEĞİŞİKLİK TAKVİMİ & ÇAKIŞMA TESPİTİ
// ------------------------------------------------------------------
export interface ScheduledChange {
  id: string
  ref: string
  title: string
  status: ChangeStatus
  risk_score: number
  scheduled_start: string
  scheduled_end: string | null
  ci_id: string | null
  ci: { name: string; tag: string } | null
}

export interface ChangeConflict {
  a: ScheduledChange
  b: ScheduledChange
}

/** Planlanmış (scheduled_start dolu) tüm değişiklikleri getirir — takvim
 * görünümü ve CI bazlı çakışma tespiti için. */
export function useScheduledChanges() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['scheduled-changes', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('changes')
        .select('id, ref, title, status, risk_score, scheduled_start, scheduled_end, ci_id, ci:ci_id ( name, tag )')
        .not('scheduled_start', 'is', null)
        .not('status', 'in', '(completed,failed,closed)')
        .order('scheduled_start')
      if (error) throw error
      return data as unknown as ScheduledChange[]
    },
  })
}

/** Aynı CI üzerinde zaman aralığı çakışan değişiklik çiftlerini bulur.
 * CI bağlanmamış (ci_id null) değişiklikler çakışma taramasına girmez —
 * hangi sisteme dokunduğu bilinmediği için karşılaştırılamaz. */
export function findChangeConflicts(changes: ScheduledChange[]): ChangeConflict[] {
  const conflicts: ChangeConflict[] = []
  const withCi = changes.filter((c) => c.ci_id)

  for (let i = 0; i < withCi.length; i++) {
    for (let j = i + 1; j < withCi.length; j++) {
      const a = withCi[i]
      const b = withCi[j]
      if (a.ci_id !== b.ci_id) continue

      const aStart = new Date(a.scheduled_start).getTime()
      const aEnd = new Date(a.scheduled_end ?? a.scheduled_start).getTime()
      const bStart = new Date(b.scheduled_start).getTime()
      const bEnd = new Date(b.scheduled_end ?? b.scheduled_start).getTime()

      if (aStart < bEnd && bStart < aEnd) conflicts.push({ a, b })
    }
  }
  return conflicts
}

export function useLinkChangeToCi(changeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ciId: string | null) => {
      const { error } = await supabase.from('changes').update({ ci_id: ciId }).eq('id', changeId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['change', changeId] })
      qc.invalidateQueries({ queryKey: ['changes'] })
    },
  })
}

export function useUpdateChange(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      patch: Partial<{
        status: ChangeStatus
        rollback_plan: string
        pir_outcome: PirOutcome
        pir_notes: string
        scheduled_start: string
        scheduled_end: string
      }>
    ) => {
      const { error } = await supabase.from('changes').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['changes'] })
      qc.invalidateQueries({ queryKey: ['change', id] })
      qc.invalidateQueries({ queryKey: ['change-approvals', id] })
      qc.invalidateQueries({ queryKey: ['my-pending-approvals'] })
    },
  })
}

/** Bir onay satırını onaylar/reddeder. Tüm onaylar tamamlanınca değişikliği
 * otomatik olarak bir sonraki duruma taşır (basit, istemci taraflı orkestrasyon). */
export function useDecideApproval(changeId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (input: { approvalId: string; decision: 'approved' | 'rejected'; comment?: string }) => {
      const { error } = await supabase
        .from('change_approvals')
        .update({
          status: input.decision,
          approver_id: profile?.id,
          comment: input.comment ?? null,
          decided_at: new Date().toISOString(),
        })
        .eq('id', input.approvalId)
      if (error) throw error

      if (input.decision === 'rejected') {
        await supabase.from('changes').update({ status: 'draft' }).eq('id', changeId)
        return
      }

      // Tüm onaylar tamamlandı mı kontrol et
      const { data: approvals, error: fetchError } = await supabase
        .from('change_approvals')
        .select('status')
        .eq('change_id', changeId)
      if (fetchError) throw fetchError

      const allApproved = approvals?.every((a) => a.status === 'approved')
      if (allApproved) {
        await supabase.from('changes').update({ status: 'approved' }).eq('id', changeId)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['changes'] })
      qc.invalidateQueries({ queryKey: ['change', changeId] })
      qc.invalidateQueries({ queryKey: ['change-approvals', changeId] })
      qc.invalidateQueries({ queryKey: ['my-pending-approvals'] })
    },
  })
}

// ------------------------------------------------------------------
// STANDART DEĞİŞİKLİK ŞABLONLARI
// ------------------------------------------------------------------
export interface ChangeTemplate {
  id: string
  name: string
  description: string | null
  category: string | null
  default_risk_score: number
  default_rollback_plan: string | null
}

export function useChangeTemplates() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['change-templates', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_templates')
        .select('id, name, description, category, default_risk_score, default_rollback_plan')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as ChangeTemplate[]
    },
  })
}

export function useCreateChangeTemplate() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { name: string; description: string; category: string; defaultRiskScore: number; defaultRollbackPlan: string }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('change_templates').insert({
        tenant_id: profile.tenantId,
        name: input.name,
        description: input.description || null,
        category: input.category || null,
        default_risk_score: input.defaultRiskScore,
        default_rollback_plan: input.defaultRollbackPlan || null,
        is_active: true,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['change-templates'] }),
  })
}

// ------------------------------------------------------------------
// DEĞİŞİKLİK ANALİTİK — risk dağılımı, onay darboğazı, başarı trendi
// ------------------------------------------------------------------
export interface RiskDistribution {
  bucket: string
  change_count: number
}

export function useChangeRiskDistribution() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['change-risk-distribution', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_change_risk_distribution', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as RiskDistribution[]
    },
  })
}

export interface ApprovalBottleneck {
  approval_type: string
  avg_wait_hours: number
  decided_count: number
}

export function useApprovalBottleneck() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['approval-bottleneck', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_approval_bottleneck', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as ApprovalBottleneck[]
    },
  })
}

export interface ChangeSuccessTrend {
  week_start: string
  successful_count: number
  failed_count: number
}

export function useChangeSuccessTrend() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['change-success-trend', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weekly_change_success_trend', { p_tenant_id: profile!.tenantId })
      if (error) throw error
      return data as ChangeSuccessTrend[]
    },
  })
}
