import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Priority, AutomationAction } from '@/types/database'

export interface AutomationRule {
  id: string
  name: string
  condition_category: string | null
  condition_priority: Priority | null
  action_type: AutomationAction
  action_priority: Priority | null
  is_active: boolean
  execution_count: number
  assignee: { full_name: string } | null
}

export function useAutomationRules() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['automation-rules', profile?.tenantId],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_rules')
        .select(
          'id, name, condition_category, condition_priority, action_type, action_priority, is_active, execution_count, assignee:action_assignee_id ( full_name )'
        )
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as AutomationRule[]
    },
  })
}

export function useCreateRule() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: {
      name: string
      conditionCategory: string | null
      conditionPriority: Priority | null
      actionType: AutomationAction
      actionAssigneeId: string | null
      actionPriority: Priority | null
    }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('automation_rules').insert({
        tenant_id: profile.tenantId,
        name: input.name,
        trigger_type: 'incident_created',
        condition_category: input.conditionCategory,
        condition_priority: input.conditionPriority,
        action_type: input.actionType,
        action_assignee_id: input.actionAssigneeId,
        action_priority: input.actionPriority,
        is_active: true,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
  })
}

export function useToggleRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('automation_rules').update({ is_active: input.is_active }).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
  })
}

export function useDeleteRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automation_rules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-rules'] }),
  })
}
