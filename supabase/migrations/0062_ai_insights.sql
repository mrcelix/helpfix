-- ============================================================================
-- 0062 — Faz 3 (Insights): AI Benimseme İstatistikleri
--
-- 0061'deki ai_events denetim izinden liderlik metrikleri üretir:
--   * Triyaj isabet oranı  → agent'lar AI önerisini ne sıklıkla kabul ediyor?
--   * Deflection oranı     → ai-chat kaç sorunu talep açmadan çözdü?
--   * Özet/taslak kullanımı → agent tarafında AI ne kadar benimsendi?
--
-- Not: triage_accepted/rejected olayları NewTicketModal'daki öneri akışına
-- Faz 1'de log eklendiği günden itibaren birikir; ilk haftalarda örneklem
-- küçük olabilir. get_ai_adoption_stats security definer DEĞİL — ai_events
-- RLS'i (tenant_id = current_tenant_id()) zaten devrede, p_tenant_id
-- parametresi mevcut analitik RPC'leriyle imza tutarlılığı içindir.
-- ============================================================================

create or replace function get_ai_adoption_stats(p_tenant_id uuid, p_days int default 30)
returns table (
  triage_runs      bigint,
  triage_accepted  bigint,
  triage_rejected  bigint,
  accept_rate      numeric,   -- % (kabul / (kabul+ret)); örneklem yoksa null
  summary_runs     bigint,
  draft_runs       bigint,
  chat_deflected   bigint,
  chat_escalated   bigint,
  deflection_rate  numeric,   -- % (deflected / (deflected+escalated)); yoksa null
  total_events     bigint
)
language sql
stable
as $$
  with ev as (
    select event_type
    from ai_events
    where tenant_id = p_tenant_id
      and created_at >= now() - make_interval(days => p_days)
  ),
  c as (
    select
      count(*) filter (where event_type = 'triage_run')      as triage_runs,
      count(*) filter (where event_type = 'triage_accepted') as triage_accepted,
      count(*) filter (where event_type = 'triage_rejected') as triage_rejected,
      count(*) filter (where event_type = 'summary_run')     as summary_runs,
      count(*) filter (where event_type = 'draft_run')       as draft_runs,
      count(*) filter (where event_type = 'chat_deflected')  as chat_deflected,
      count(*) filter (where event_type = 'chat_escalated')  as chat_escalated,
      count(*)                                               as total_events
    from ev
  )
  select
    c.triage_runs,
    c.triage_accepted,
    c.triage_rejected,
    case when (c.triage_accepted + c.triage_rejected) > 0
         then round(100.0 * c.triage_accepted / (c.triage_accepted + c.triage_rejected), 1)
         else null end as accept_rate,
    c.summary_runs,
    c.draft_runs,
    c.chat_deflected,
    c.chat_escalated,
    case when (c.chat_deflected + c.chat_escalated) > 0
         then round(100.0 * c.chat_deflected / (c.chat_deflected + c.chat_escalated), 1)
         else null end as deflection_rate,
    c.total_events
  from c;
$$;
