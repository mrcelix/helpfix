-- ============================================================
-- HelpFix — 0010_monitoring.sql
-- Olay/İzleme: çoklu kaynak (Datadog/Zabbix/Prometheus/CloudWatch)
-- uyarıları, onaylama/çözme akışı, bir olaya (incident) dönüştürme.
-- ============================================================

create type alert_source as enum ('datadog', 'zabbix', 'prometheus', 'cloudwatch', 'manual');
create type alert_severity as enum ('critical', 'warning', 'info');
create type alert_status as enum ('firing', 'acknowledged', 'resolved');

create table monitoring_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  source alert_source not null default 'manual',
  title text not null,
  description text,
  severity alert_severity not null default 'warning',
  status alert_status not null default 'firing',
  ci_id uuid references configuration_items(id),
  incident_id uuid references incidents(id), -- bu uyarıdan oluşturulan olay
  acknowledged_by uuid references user_profiles(id),
  fired_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

create index idx_alerts_tenant on monitoring_alerts(tenant_id);
create index idx_alerts_status on monitoring_alerts(tenant_id, status);
create index idx_alerts_ci on monitoring_alerts(ci_id);

-- Son 14 günde günlük uyarı hacmi (gürültü azaltma trend grafiği için).
create or replace function get_daily_alert_volume(p_tenant_id uuid)
returns table (day date, alert_count bigint, critical_count bigint)
language sql
stable
as $$
  with days as (
    select generate_series(
      (now() - interval '13 days')::date,
      now()::date,
      interval '1 day'
    )::date as day
  )
  select
    d.day,
    count(a.id) filter (where a.fired_at::date = d.day) as alert_count,
    count(a.id) filter (where a.fired_at::date = d.day and a.severity = 'critical') as critical_count
  from days d
  left join monitoring_alerts a on a.tenant_id = p_tenant_id
  group by d.day
  order by d.day
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table monitoring_alerts enable row level security;

create policy monitoring_alerts_select on monitoring_alerts
  for select using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

create policy monitoring_alerts_write on monitoring_alerts
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  )
  with check (tenant_id = current_tenant_id());
