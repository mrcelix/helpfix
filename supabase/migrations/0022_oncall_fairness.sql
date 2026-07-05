-- ============================================================
-- HelpFix — 0022_oncall_fairness.sql
-- Cila: On-Call'a Adalet Analitiği — son 30 günde kim kaç vardiya/saat
-- almış, gerçek veriden hesaplanır.
-- ============================================================

create or replace function get_oncall_fairness(p_tenant_id uuid, p_schedule_id uuid)
returns table (user_id uuid, full_name text, shift_count bigint, total_hours numeric)
language sql
stable
as $$
  select
    up.id as user_id,
    up.full_name,
    count(s.id) as shift_count,
    round(sum(extract(epoch from (s.end_time - s.start_time)) / 3600)::numeric, 1) as total_hours
  from oncall_shifts s
  join user_profiles up on up.id = s.user_id
  where s.tenant_id = p_tenant_id
    and s.schedule_id = p_schedule_id
    and s.start_time > now() - interval '30 days'
  group by up.id, up.full_name
  order by total_hours desc
$$;
