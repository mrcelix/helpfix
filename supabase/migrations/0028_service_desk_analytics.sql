-- ============================================================
-- HelpFix — 0028_service_desk_analytics.sql
-- Cila: Servis Masası'na kendi Analitik sekmesi — kanal dağılımı,
-- teknisyen CSAT lideri tablosu, 14 günlük trend.
-- ============================================================

create or replace function get_channel_distribution(p_tenant_id uuid)
returns table (channel ticket_channel, ticket_count bigint)
language sql
stable
as $$
  select channel, count(*) as ticket_count
  from incidents
  where tenant_id = p_tenant_id and created_at > now() - interval '30 days'
  group by channel
  order by ticket_count desc
$$;

create or replace function get_technician_csat_leaderboard(p_tenant_id uuid)
returns table (technician_id uuid, full_name text, avg_csat numeric, ticket_count bigint)
language sql
stable
as $$
  select
    up.id as technician_id,
    up.full_name,
    round(avg(i.csat_score)::numeric, 2) as avg_csat,
    count(i.id) as ticket_count
  from incidents i
  join user_profiles up on up.id = i.assignee_id
  where i.tenant_id = p_tenant_id
    and i.csat_score is not null
    and i.created_at > now() - interval '90 days'
  group by up.id, up.full_name
  order by avg_csat desc
$$;
