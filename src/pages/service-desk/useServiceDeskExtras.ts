import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { TicketChannel } from '@/types/database'
import type { SavedView } from './useIncidents'

// ------------------------------------------------------------------
// HAZIR YANITLAR (Canned Responses)
// ------------------------------------------------------------------
export interface CannedResponse {
  id: string
  title: string
  body: string
  created_by: string | null
}

export function useCannedResponses() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['canned-responses', profile?.tenantId],
    enabled: !!profile && ['tenant_admin', 'manager', 'agent'].includes(profile.role),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canned_responses')
        .select('id, title, body, created_by')
        .order('title', { ascending: true })
      if (error) throw error
      return data as CannedResponse[]
    },
  })
}

export function useCreateCannedResponse() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { title: string; body: string }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('canned_responses').insert({
        tenant_id: profile.tenantId,
        title: input.title,
        body: input.body,
        created_by: profile.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['canned-responses'] }),
  })
}

export function useDeleteCannedResponse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('canned_responses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['canned-responses'] }),
  })
}

// ------------------------------------------------------------------
// KAYDEDİLMİŞ GÖRÜNÜMLER (kişiye özel filtre kombinasyonları)
// ------------------------------------------------------------------
export interface SavedFilterState {
  view: SavedView
  channel: TicketChannel | 'all'
  sortBy: 'created_desc' | 'priority' | 'sla' | 'az'
}

export interface SavedFilter {
  id: string
  name: string
  filters: SavedFilterState
}

export function useSavedFilters() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['saved-filters', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_filters')
        .select('id, name, filters')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as unknown as SavedFilter[]
    },
  })
}

export function useSaveFilter() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async (input: { name: string; filters: SavedFilterState }) => {
      if (!profile) throw new Error('Profil yüklenmedi')
      const { error } = await supabase.from('saved_filters').insert({
        tenant_id: profile.tenantId,
        user_id: profile.id,
        name: input.name,
        filters: input.filters as unknown as Record<string, unknown>,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-filters'] }),
  })
}

export function useDeleteSavedFilter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_filters').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-filters'] }),
  })
}

// ------------------------------------------------------------------
// AJAN ÇARPIŞMA GÖSTERGESİ — Supabase Realtime presence.
// Aynı kaydı açık tutan diğer kullanıcıları döndürür (kendisi hariç).
// Tablo gerektirmez; drawer açıkken kanala katılır, kapanınca ayrılır.
// ------------------------------------------------------------------
export interface Viewer {
  profileId: string
  fullName: string
}

export function useTicketPresence(incidentId: string) {
  const { profile } = useAuth()
  const [viewers, setViewers] = useState<Viewer[]>([])

  useEffect(() => {
    if (!profile) return
    const channel = supabase.channel(`presence-incident-${incidentId}`, {
      config: { presence: { key: profile.id } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ profileId: string; fullName: string }>()
        const others: Viewer[] = []
        for (const key of Object.keys(state)) {
          if (key === profile.id) continue
          const meta = state[key][0]
          if (meta) others.push({ profileId: meta.profileId, fullName: meta.fullName })
        }
        setViewers(others)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ profileId: profile.id, fullName: profile.fullName })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [incidentId, profile])

  return viewers
}

// ------------------------------------------------------------------
// SLA KALAN SÜRE — liste satırındaki gösterge için yardımcılar
// ------------------------------------------------------------------
export interface SlaMeterInfo {
  /** 0-100 arası geçen süre yüzdesi (ihlalde 100'e sabitlenir) */
  pct: number
  /** 'ok' | 'warn' | 'danger' | 'breached' */
  level: 'ok' | 'warn' | 'danger' | 'breached'
  /** İnsan okunur kalan/aşan süre: "2s 15d", "3g 4s" */
  remainingLabel: string
}

export function computeSlaMeter(createdAt: string, dueAt: string, now = Date.now()): SlaMeterInfo {
  const start = new Date(createdAt).getTime()
  const due = new Date(dueAt).getTime()
  const total = Math.max(due - start, 1)
  const elapsed = now - start
  const remaining = due - now

  const pct = Math.min(Math.max((elapsed / total) * 100, 0), 100)
  const level: SlaMeterInfo['level'] =
    remaining <= 0 ? 'breached' : pct >= 85 ? 'danger' : pct >= 60 ? 'warn' : 'ok'

  return { pct, level, remainingLabel: formatDuration(Math.abs(remaining)) }
}

export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60
  if (days > 0) return `${days}g ${hours}s`
  if (hours > 0) return `${hours}s ${mins}d`
  return `${mins}d`
}
