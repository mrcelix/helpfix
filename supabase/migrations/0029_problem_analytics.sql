-- ============================================================
-- HelpFix — 0029_problem_analytics.sql
-- Cila: Problem Yönetimi'ne kendi Analitik sekmesi — kök neden
-- kategori dağılımı (Fishbone verisinden) ve haftalık çözüm trendi.
-- ============================================================

create or replace function get_root_cause_category_breakdown(p_tenant_id uuid)
returns table (category fishbone_category, confirmed_count bigint)
language sql
stable
as $$
  select category, count(*) as confirmed_count
  from problem_fishbone_causes
  where tenant_id = p_tenant_id and is_confirmed_root_cause = true
  group by category
  order by confirmed_count desc
$$;

create or replace function get_weekly_problem_trend(p_tenant_id uuid)
returns table (week_start date, created_count bigint, resolved_count bigint)
language sql
stable
as $$
  with weeks as (
    select generate_series(
      date_trunc('week', now() - interval '7 weeks'),
      date_trunc('week', now()),
      interval '1 week'
    )::date as week_start
  )
  select
    w.week_start,
    count(p.id) filter (where p.created_at >= w.week_start and p.created_at < w.week_start + interval '1 week') as created_count,
    count(p.id) filter (where p.resolved_at >= w.week_start and p.resolved_at < w.week_start + interval '1 week') as resolved_count
  from weeks w
  left join problems p on p.tenant_id = p_tenant_id
  group by w.week_start
  order by w.week_start
$$;
