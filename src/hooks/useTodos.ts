import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface PersonalTodo {
  id: string
  text: string
  is_done: boolean
  created_at: string
}

export function useMyTodos() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['personal-todos', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from('personal_todos').select('id, text, is_done, created_at').order('created_at', { ascending: false })
      if (error) throw error
      return data as PersonalTodo[]
    },
  })
}

export function useAddTodo() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (text: string) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('personal_todos').insert({ tenant_id: profile.tenantId, user_id: profile.id, text, is_done: false })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal-todos'] }),
  })
}

export function useToggleTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; isDone: boolean }) => {
      const { error } = await supabase.from('personal_todos').update({ is_done: input.isDone }).eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal-todos'] }),
  })
}

export function useDeleteTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('personal_todos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal-todos'] }),
  })
}
