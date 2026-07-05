-- ============================================================
-- HelpFix — 0021_mtta.sql
-- Cila: Olay/İzleme'ye kaynak bazlı MTTA (Mean Time To Acknowledge).
-- ============================================================

create or replace function get_mtta_by_source(p_tenant_id uuid)
returns table (source alert_source, avg_minutes numeric, alert_count bigint)
language sql
stable
as $$
  select
    source,
    round(avg(extract(epoch from (acknowledged_at - fired_at)) / 60)::numeric, 1) as avg_minutes,
    count(*) as alert_count
  from monitoring_alerts
  where tenant_id = p_tenant_id
    and acknowledged_at is not null
    and fired_at > now() - interval '30 days'
  group by source
  order by avg_minutes desc
$$;
