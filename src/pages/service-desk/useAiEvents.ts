// Faz 1 (AI Derinleştirme) — AI denetim izi + benzer kayıt hook'ları
//
// logAiEvent: fire-and-forget denetim kaydı. tenant_id/actor_id sunucu
// tarafında default'la dolar (0061), istemci sadece olay tipini ve
// içeriği gönderir. Hata olursa akışı BOZMAZ — sessizce loglanır.
//
// useSimilarIncidents: 0061'deki find_similar_incidents RPC'si üzerinden
// aynı tenant'taki benzer çözülmüş kayıtları getirir.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Priority, TicketStatus } from '@/types/database'

export type AiEventType =
  | 'triage_run'
  | 'triage_accepted'
  | 'triage_rejected'
  | 'summary_run'
  | 'draft_run'
  | 'chat_deflected'
  | 'chat_escalated'

export function logAiEvent(input: {
  eventType: AiEventType
  incidentId?: string | null
  output?: Record<string, unknown>
}) {
  supabase
    .from('ai_events')
    .insert({
      event_type: input.eventType,
      incident_id: input.incidentId ?? null,
      output: input.output ?? null,
    })
    .then(({ error }) => {
      if (error) console.warn('ai_events log hatası:', error.message)
    })
}

export interface SimilarIncident {
  id: string
  ref: string
  title: string
  status: TicketStatus
  priority: Priority
  similarity: number
  created_at: string
}

export function useSimilarIncidents(incidentId: string | null) {
  return useQuery({
    queryKey: ['similar-incidents', incidentId],
    enabled: !!incidentId,
    staleTime: 60_000,
    queryFn: async (): Promise<SimilarIncident[]> => {
      const { data, error } = await supabase.rpc('find_similar_incidents', {
        p_incident_id: incidentId!,
        p_limit: 5,
      })
      if (error) throw error
      return (data ?? []) as SimilarIncident[]
    },
  })
}
