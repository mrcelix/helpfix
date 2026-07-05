import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ProjectStatus, ProjectHealth, TaskStatus, RiskLevel, RiskStatus } from '@/types/database'

export interface ProjectListItem {
  id: string
  name: string
  status: ProjectStatus
  health: ProjectHealth
  start_date: string | null
  end_date: string | null
  owner: { full_name: string } | null
}

export interface ProjectDetail extends ProjectListItem {
  description: string | null
  budget: number | null
}

export interface ProjectTask {
  id: string
  title: string
  status: TaskStatus
  due_date: string | null
  start_date: string | null
  assignee: { full_name: string } | null
}

export interface ProjectRisk {
  id: string
  title: string
  description: string | null
  impact: RiskLevel
  likelihood: RiskLevel
  status: RiskStatus
}

export function useProjects() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['projects', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, health, start_date, end_date, owner:owner_id ( full_name )')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as ProjectListItem[]
    },
  })
}

export function useProjectDetail(id: string | null) {
  return useQuery({
    queryKey: ['project', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, health, start_date, end_date, owner:owner_id ( full_name ), description, budget')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as ProjectDetail
    },
  })
}

export function useProjectTasks(projectId: string | null) {
  return useQuery({
    queryKey: ['project-tasks', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('id, title, status, due_date, start_date, assignee:assignee_id ( full_name )')
        .eq('project_id', projectId!)
        .order('sort_order')
      if (error) throw error
      return data as unknown as ProjectTask[]
    },
  })
}

export function useProjectRisks(projectId: string | null) {
  return useQuery({
    queryKey: ['project-risks', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_risks')
        .select('id, title, description, impact, likelihood, status')
        .eq('project_id', projectId!)
      if (error) throw error
      return data as ProjectRisk[]
    },
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { name: string; description: string; start_date: string | null; end_date: string | null }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('projects').insert({
        tenant_id: profile.tenantId,
        name: input.name,
        description: input.description,
        status: 'planning',
        health: 'green',
        owner_id: profile.id,
        start_date: input.start_date,
        end_date: input.end_date,
        budget: null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<{ status: ProjectStatus; health: ProjectHealth }>) => {
      const { error } = await supabase.from('projects').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', id] })
    },
  })
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { title: string; startDate: string | null; dueDate: string | null }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('project_tasks').insert({
        tenant_id: profile.tenantId,
        project_id: projectId,
        title: input.title,
        status: 'todo',
        assignee_id: null,
        due_date: input.dueDate,
        start_date: input.startDate,
        sort_order: Date.now(),
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tasks', projectId] }),
  })
}

export function useUpdateTaskStatus(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { taskId: string; status: TaskStatus }) => {
      const { error } = await supabase.from('project_tasks').update({ status: input.status }).eq('id', input.taskId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-tasks', projectId] }),
  })
}

export function useCreateRisk(projectId: string) {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { title: string; description: string; impact: RiskLevel; likelihood: RiskLevel }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('project_risks').insert({
        tenant_id: profile.tenantId,
        project_id: projectId,
        title: input.title,
        description: input.description || null,
        impact: input.impact,
        likelihood: input.likelihood,
        status: 'open',
        owner_id: profile.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-risks', projectId] }),
  })
}

// ------------------------------------------------------------------
// KAYNAK KAPASİTE ISI HARİTASI — tüm projelerdeki görevlerden
// kullanıcı bazlı haftalık yük hesaplama.
// ------------------------------------------------------------------
export interface CapacityRow {
  userId: string
  fullName: string
  weeks: Record<string, number> // "2026-W27" -> görev sayısı
}

export function useResourceCapacity() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['resource-capacity', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('due_date, assignee:assignee_id ( id, full_name )')
        .not('assignee_id', 'is', null)
        .not('due_date', 'is', null)
        .neq('status', 'done')
      if (error) throw error

      const rows = data as unknown as { due_date: string; assignee: { id: string; full_name: string } }[]
      const byUser = new Map<string, CapacityRow>()

      rows.forEach((r) => {
        if (!r.assignee) return
        const date = new Date(r.due_date)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        const weekKey = weekStart.toISOString().slice(0, 10)

        if (!byUser.has(r.assignee.id)) {
          byUser.set(r.assignee.id, { userId: r.assignee.id, fullName: r.assignee.full_name, weeks: {} })
        }
        const entry = byUser.get(r.assignee.id)!
        entry.weeks[weekKey] = (entry.weeks[weekKey] ?? 0) + 1
      })

      return Array.from(byUser.values())
    },
  })
}
