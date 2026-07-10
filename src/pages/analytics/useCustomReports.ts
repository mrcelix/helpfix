import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { priorityLabel } from '@/lib/priority'
import type { Priority } from '@/types/database'

export type ReportDataSource = 'incidents' | 'problems' | 'changes' | 'service_requests'
export type ReportGroupBy = 'category' | 'priority' | 'status' | 'assignee' | 'week'

export const DATA_SOURCE_LABEL: Record<ReportDataSource, { tr: string; en: string }> = {
  incidents: { tr: 'Servis Masası Talepleri', en: 'Service Desk Tickets' },
  problems: { tr: 'Problemler', en: 'Problems' },
  changes: { tr: 'Değişiklikler', en: 'Changes' },
  service_requests: { tr: 'Katalog Talepleri', en: 'Catalog Requests' },
}

export const GROUP_BY_LABEL: Record<ReportGroupBy, { tr: string; en: string }> = {
  category: { tr: 'Kategori', en: 'Category' },
  priority: { tr: 'Öncelik', en: 'Priority' },
  status: { tr: 'Durum', en: 'Status' },
  assignee: { tr: 'Atanan Kişi', en: 'Assignee' },
  week: { tr: 'Hafta', en: 'Week' },
}

/** Her veri kaynağının hangi gruplama boyutlarını desteklediği — UI'da
 * geçersiz kombinasyonları (örn. Değişiklikler'de Öncelik) gizlemek için. */
export const SUPPORTED_GROUP_BY: Record<ReportDataSource, ReportGroupBy[]> = {
  incidents: ['category', 'priority', 'status', 'assignee', 'week'],
  problems: ['category', 'priority', 'status', 'assignee', 'week'],
  changes: ['category', 'status', 'assignee', 'week'],
  service_requests: ['status', 'assignee', 'week'],
}

interface SourceConfig {
  table: string
  select: string
  assigneeKey: string | null
}

const SOURCE_CONFIG: Record<ReportDataSource, SourceConfig> = {
  incidents: { table: 'incidents', select: 'category, priority, status, created_at, assignee:assignee_id ( full_name )', assigneeKey: 'assignee' },
  problems: { table: 'problems', select: 'category, priority, status, created_at, owner:owner_id ( full_name )', assigneeKey: 'owner' },
  changes: { table: 'changes', select: 'category, status, created_at, implementer:implementer_id ( full_name )', assigneeKey: 'implementer' },
  service_requests: { table: 'service_requests', select: 'status, created_at, requester:requester_id ( full_name )', assigneeKey: 'requester' },
}

export interface ReportBucket {
  label: string
  count: number
}

export function useReportData(dataSource: ReportDataSource, groupBy: ReportGroupBy, dateRangeDays: number) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['custom-report-data', profile?.tenantId, dataSource, groupBy, dateRangeDays],
    enabled: !!profile,
    queryFn: async (): Promise<ReportBucket[]> => {
      const config = SOURCE_CONFIG[dataSource]
      const since = new Date(Date.now() - dateRangeDays * 86_400_000).toISOString()

      const { data, error } = await supabase.from(config.table).select(config.select).gte('created_at', since).limit(2000)
      if (error) throw error

      const rows = data as unknown as Record<string, unknown>[]
      const counts = new Map<string, number>()

      for (const row of rows) {
        let label: string
        if (groupBy === 'week') {
          const d = new Date(row.created_at as string)
          const monday = new Date(d)
          monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
          label = monday.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
        } else if (groupBy === 'assignee') {
          const assignee = config.assigneeKey ? (row[config.assigneeKey] as { full_name: string } | null) : null
          label = assignee?.full_name ?? 'Atanmamış'
        } else if (groupBy === 'priority') {
          label = row.priority ? priorityLabel(row.priority as Priority, 'tr') : 'Belirsiz'
        } else {
          label = (row[groupBy] as string | null) ?? 'Belirsiz'
        }
        counts.set(label, (counts.get(label) ?? 0) + 1)
      }

      return Array.from(counts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
    },
  })
}

export interface CustomReport {
  id: string
  name: string
  data_source: ReportDataSource
  group_by: ReportGroupBy
  date_range_days: number
}

export function useCustomReports() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['custom-reports', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_reports')
        .select('id, name, data_source, group_by, date_range_days')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as CustomReport[]
    },
  })
}

export function useSaveCustomReport() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { name: string; dataSource: ReportDataSource; groupBy: ReportGroupBy; dateRangeDays: number }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('custom_reports').insert({
        tenant_id: profile.tenantId,
        created_by: profile.id,
        name: input.name,
        data_source: input.dataSource,
        group_by: input.groupBy,
        date_range_days: input.dateRangeDays,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-reports'] }),
  })
}

export function useDeleteCustomReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_reports').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-reports'] }),
  })
}

export function exportReportCsv(buckets: ReportBucket[], filename: string) {
  const headers = ['Grup', 'Sayı']
  const rows = buckets.map((b) => [b.label, String(b.count)])
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
