-- ============================================================
-- HelpFix — 0035_major_incident_war_room.sql
-- Cila: Servis Masası'na Büyük Olay (Major Incident) War Room —
-- bir P1 olayını "büyük olay" olarak işaretleme + birden fazla
-- müdahale ekibi üyesi ekleyebilme (tek bir assignee yeterli değil).
-- ============================================================

alter table incidents add column is_major_incident boolean not null default false;
alter table incidents add column major_incident_declared_at timestamptz;

create table incident_responders (
  incident_id uuid not null references incidents(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (incident_id, user_id)
);

alter table incident_responders enable row level security;

create policy incident_responders_select on incident_responders
  for select using (
    exists (
      select 1 from incidents i
      where i.id = incident_responders.incident_id
        and i.tenant_id = current_tenant_id()
        and current_user_role() in ('tenant_admin', 'manager', 'agent')
    )
  );

create policy incident_responders_write on incident_responders
  for all using (
    exists (
      select 1 from incidents i
      where i.id = incident_responders.incident_id
        and i.tenant_id = current_tenant_id()
        and current_user_role() in ('tenant_admin', 'manager', 'agent')
    )
  );

-- Büyük olay ilan edildiğinde zaman damgasını otomatik ayarla.
create or replace function set_major_incident_timestamp()
returns trigger
language plpgsql
as $$
begin
  if new.is_major_incident = true and old.is_major_incident is distinct from true then
    new.major_incident_declared_at := now();
  end if;
  return new;
end;
$$;

create trigger trg_major_incident_timestamp
  before update on incidents
  for each row execute function set_major_incident_timestamp();

-- Günlük (14 gün) olay hacmi — Servis Masası'nın kendi Analitik
-- sekmesindeki trend grafiği için.
create or replace function get_service_desk_daily_volume(p_tenant_id uuid)
returns table (day date, created_count bigint, resolved_count bigint)
language sql
stable
as $$
  with days as (
    select generate_series(
      current_date - interval '13 days',
      current_date,
      interval '1 day'
    )::date as day
  )
  select
    d.day,
    count(i.id) filter (where i.created_at::date = d.day) as created_count,
    count(i.id) filter (where i.resolved_at::date = d.day) as resolved_count
  from days d
  left join incidents i on i.tenant_id = p_tenant_id
  group by d.day
  order by d.day
$$;
