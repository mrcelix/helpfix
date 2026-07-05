-- ============================================================
-- HelpFix — 0009_analytics.sql
-- Raporlama & Analitik: yeni bir tablo yok — mevcut modüllerin
-- verisi üzerinde gerçek zamanlı toplama yapan RPC fonksiyonları.
-- ============================================================

-- Son 8 haftada oluşturulan ve çözülen olay sayıları (haftalık trend
-- grafiği için).
create or replace function get_weekly_incident_trend(p_tenant_id uuid)
returns table (
  week_start date,
  created_count bigint,
  resolved_count bigint
)
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
    count(i.id) filter (where i.created_at >= w.week_start and i.created_at < w.week_start + interval '1 week') as created_count,
    count(i.id) filter (where i.resolved_at >= w.week_start and i.resolved_at < w.week_start + interval '1 week') as resolved_count
  from weeks w
  left join incidents i on i.tenant_id = p_tenant_id
  group by w.week_start
  order by w.week_start
$$;

-- Son 30 günde çözülen/kapatılan olaylarda SLA uyumluluk oranı.
create or replace function get_sla_compliance(p_tenant_id uuid)
returns table (
  total_resolved bigint,
  breached_count bigint,
  compliance_percent numeric
)
language sql
stable
as $$
  select
    count(*) as total_resolved,
    count(*) filter (where sla_due_at is not null and resolved_at > sla_due_at) as breached_count,
    case
      when count(*) = 0 then 100
      else round(
        100.0 * count(*) filter (where sla_due_at is null or resolved_at <= sla_due_at) / count(*),
        1
      )
    end as compliance_percent
  from incidents
  where tenant_id = p_tenant_id
    and status in ('resolved', 'closed')
    and resolved_at >= now() - interval '30 days'
$$;

-- Değişiklik başarı oranı (kapatılmış değişikliklerde PIR sonucuna göre).
create or replace function get_change_success_rate(p_tenant_id uuid)
returns table (
  total_closed bigint,
  successful_count bigint,
  success_percent numeric
)
language sql
stable
as $$
  select
    count(*) as total_closed,
    count(*) filter (where pir_outcome = 'successful') as successful_count,
    case
      when count(*) = 0 then 100
      else round(100.0 * count(*) filter (where pir_outcome = 'successful') / count(*), 1)
    end as success_percent
  from changes
  where tenant_id = p_tenant_id and status = 'closed'
$$;
