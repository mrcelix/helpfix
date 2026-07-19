import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_incident_id: string | null
  created_at: string
}

export function useChatMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['chat-messages', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_incident_id, created_at')
        .eq('conversation_id', conversationId!)
        .order('created_at')
      if (error) throw error
      return data as ChatMessage[]
    },
  })
}

export function useSendChatMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { conversationId: string | null; message: string }) => {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { conversationId: input.conversationId, message: input.message },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data as { conversationId: string; reply: string; createdIncident: { id: string; ref: string } | null }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['chat-messages', data.conversationId] })
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
      // Bir talep oluşturulduysa ilgili listeler de güncellensin
      if (data.createdIncident) qc.invalidateQueries({ queryKey: ['incidents'] })
    },
    // Sohbet mesajları için hata zaten sohbet balonunda gösterilecek —
    // global toast'u ikinci kez tetiklemesin.
    meta: { silent: true },
  })
}
