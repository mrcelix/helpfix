import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Priority } from '@/types/database'

async function invokeAiAssist<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai-assist', { body })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as T
}

export interface TriageSuggestion {
  category: string
  priority: Priority
  reasoning: string
}

export function useSuggestTriage() {
  return useMutation({
    mutationFn: (input: { title: string; description: string; existingCategories?: string[] }) =>
      invokeAiAssist<TriageSuggestion>({ action: 'suggest-triage', ...input }),
    // Çağıran taraf hatayı zaten yerel olarak sessizce yutuyor (öneri
    // başarısız olursa form akışını bozmasın diye) — global toast'u da
    // ikinci kez tetiklemesin.
    meta: { silent: true },
  })
}

export interface ThreadComment {
  author: string
  body: string
  isInternal: boolean
}

export function useSummarizeTicket() {
  return useMutation({
    mutationFn: (input: { title: string; description: string; comments: ThreadComment[] }) =>
      invokeAiAssist<{ summary: string }>({ action: 'summarize', ...input }),
    meta: { silent: true },
  })
}

export function useDraftReply() {
  return useMutation({
    mutationFn: (input: { title: string; description: string; comments: ThreadComment[]; instruction?: string }) =>
      invokeAiAssist<{ draft: string }>({ action: 'draft-reply', ...input }),
    meta: { silent: true },
  })
}
