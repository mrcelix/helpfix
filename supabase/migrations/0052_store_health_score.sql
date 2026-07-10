-- ============================================================
-- HelpFix — 0052_store_health_score.sql
-- Faz BN: Mağaza IT Sağlığı Skoru (Proaktif Ölçüm) — Faz BM'i
-- (Mağaza Performansı) tamamlayan, retail-spesifik 4 sütunlu haftalık
-- skorlama modeli + dış izleme sistemlerinin veri gönderebileceği
-- entegrasyon webhook'u.
--
-- 4 sütun:
--   1) ESL Durumu        — offline oranı + SLA uyumu
--   2) Kiosk & Mobil Kasa — çalışırlık (uptime), geç açılma, tekrar eden arıza
--   3) Network            — kesinti süresi (gerçek dakika, olay geçmişinden)
--   4) Yardım Masası      — çağrı sayısı, SLA ihlali, kronik konular
-- Tek çıktı: Mağaza IT Sağlık Skoru (A/B/C) — 4 sütunun ortalaması.
--
-- GELİŞMİŞ ENTEGRASYON: her site'a benzersiz bir integration_token
-- atanır. Dış ESL/Kiosk/Network izleme sistemleri kendi token'larıyla
-- store-health-integration Edge Function'ına POST atarak cihaz durumu
-- ve operasyonel olay (geç açılma vb.) bildirebilir.
-- ============================================================

create type store_health_category as enum ('esl', 'kiosk_pos', 'network', 'other');

alter table configuration_items add column store_health_category store_health_category;

alter table sites add column integration_token uuid not null default gen_random_uuid();
create unique index idx_sites_integration_token on sites(integration_token);

create table device_status_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ci_id uuid not null references configuration_items(id) on delete cascade,
  is_online boolean not null,
  occurred_at timestamptz not null default now()
);

create index idx_device_status_events_ci on device_status_events(ci_id, occurred_at);

alter table device_status_events enable row level security;

create policy device_status_events_select on device_status_events
  for select using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'));

create or replace function log_device_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') or (tg_op = 'UPDATE' and new.is_online is distinct from old.is_online) then
    insert into device_status_events (tenant_id, ci_id, is_online, occurred_at)
    values (new.tenant_id, new.id, new.is_online, now());
  end if;
  return new;
end;
$$;

create trigger trg_log_device_status_event
  after insert or update on configuration_items
  for each row execute function log_device_status_event();

create type store_event_type as enum ('late_opening', 'recurring_fault', 'other');

create table store_operational_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  event_type store_event_type not null,
  occurred_at timestamptz not null default now(),
  note text,
  source text not null default 'manual',
  created_by uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_store_op_events_site on store_operational_events(site_id, occurred_at);

alter table store_operational_events enable row level security;

create policy store_operational_events_select on store_operational_events
  for select using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'));

create policy store_operational_events_insert on store_operational_events
  for insert with check (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'));

create table store_health_scores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  week_start date not null,
  esl_score numeric(5, 1) not null,
  kiosk_score numeric(5, 1) not null,
  network_score numeric(5, 1) not null,
  helpdesk_score numeric(5, 1) not null,
  composite_score numeric(5, 1) not null,
  letter_grade text not null check (letter_grade in ('A', 'B', 'C')),
  esl_offline_pct numeric(5, 1) not null,
  kiosk_uptime_pct numeric(5, 1) not null,
  network_downtime_minutes int not null,
  helpdesk_call_count int not null,
  helpdesk_sla_breach_count int not null,
  computed_at timestamptz not null default now(),
  unique (site_id, week_start)
);

create index idx_store_health_scores_site on store_health_scores(site_id, week_start);

alter table store_health_scores enable row level security;

create policy store_health_scores_select on store_health_scores
  for select using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'));

create policy store_health_scores_write on store_health_scores
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

create or replace function compute_store_health_score(p_site_id uuid, p_week_start date)
returns table (
  esl_score numeric, kiosk_score numeric, network_score numeric, helpdesk_score numeric,
  composite_score numeric, letter_grade text,
  esl_offline_pct numeric, kiosk_uptime_pct numeric, network_downtime_minutes int,
  helpdesk_call_count int, helpdesk_sla_breach_count int
)
language plpgsql
stable
as $$
declare
  v_week_end date := p_week_start + 7;
  v_esl_total int; v_esl_online int; v_esl_offline_pct numeric;
  v_esl_sla numeric;
  v_kiosk_total int; v_kiosk_online int; v_kiosk_uptime numeric;
  v_late_openings int;
  v_recurring_faults int;
  v_network_downtime_min int;
  v_call_count int;
  v_breach_count int;
  v_chronic_count int;
  v_esl_score numeric; v_kiosk_score numeric; v_network_score numeric; v_helpdesk_score numeric;
  v_composite numeric;
  v_letter text;
begin
  select count(*), count(*) filter (where ci.is_online)
    into v_esl_total, v_esl_online
  from configuration_items ci
  where ci.site_id = p_site_id and ci.store_health_category = 'esl' and ci.status != 'retired';

  v_esl_offline_pct := case when coalesce(v_esl_total, 0) = 0 then 0 else round((v_esl_total - v_esl_online)::numeric / v_esl_total * 100, 1) end;

  select case when count(*) filter (where i.status in ('resolved', 'closed')) = 0 then 100
    else round(
      count(*) filter (where i.status in ('resolved', 'closed') and (i.sla_due_at is null or i.resolved_at <= i.sla_due_at))::numeric
      / count(*) filter (where i.status in ('resolved', 'closed')) * 100, 1)
    end
  into v_esl_sla
  from incidents i
  join configuration_items ci on ci.id = i.ci_id
  where ci.site_id = p_site_id and ci.store_health_category = 'esl'
    and i.created_at >= p_week_start and i.created_at < v_week_end;

  v_esl_score := greatest(0, least(100, round((100 - v_esl_offline_pct) * 0.5 + coalesce(v_esl_sla, 100) * 0.5, 1)));

  select count(*), count(*) filter (where ci.is_online)
    into v_kiosk_total, v_kiosk_online
  from configuration_items ci
  where ci.site_id = p_site_id and ci.store_health_category = 'kiosk_pos' and ci.status != 'retired';

  v_kiosk_uptime := case when coalesce(v_kiosk_total, 0) = 0 then 100 else round(v_kiosk_online::numeric / v_kiosk_total * 100, 1) end;

  select count(*) into v_late_openings
  from store_operational_events
  where site_id = p_site_id and event_type = 'late_opening'
    and occurred_at >= p_week_start and occurred_at < v_week_end;

  select count(*) into v_recurring_faults
  from (
    select ci.id
    from configuration_items ci
    join device_status_events e on e.ci_id = ci.id
    where ci.site_id = p_site_id and ci.store_health_category = 'kiosk_pos'
      and e.is_online = false and e.occurred_at >= p_week_start and e.occurred_at < v_week_end
    group by ci.id
    having count(*) >= 2
  ) x;

  v_kiosk_score := least(100, greatest(0, round(v_kiosk_uptime * 0.6 + 40 - least(v_late_openings * 15, 40) - least(v_recurring_faults * 10, 30), 1)));

  with events as (
    select
      e.occurred_at,
      e.is_online,
      lead(e.occurred_at) over (partition by e.ci_id order by e.occurred_at) as next_at
    from device_status_events e
    join configuration_items ci on ci.id = e.ci_id
    where ci.site_id = p_site_id and ci.store_health_category = 'network'
      and e.occurred_at < v_week_end::timestamptz
  )
  select coalesce(sum(
    extract(epoch from (
      least(coalesce(next_at, v_week_end::timestamptz), v_week_end::timestamptz)
      - greatest(occurred_at, p_week_start::timestamptz)
    )) / 60
  ), 0)::int
  into v_network_downtime_min
  from events
  where is_online = false
    and coalesce(next_at, v_week_end::timestamptz) > p_week_start::timestamptz;

  v_network_score := greatest(0, round(100 - (v_network_downtime_min::numeric / 60) * 5, 1));

  select count(*) into v_call_count
  from incidents i where i.site_id = p_site_id and i.created_at >= p_week_start and i.created_at < v_week_end;

  select count(*) into v_breach_count
  from incidents i
  where i.site_id = p_site_id and i.created_at >= p_week_start and i.created_at < v_week_end
    and i.sla_due_at is not null and (
      (i.resolved_at is not null and i.resolved_at > i.sla_due_at) or
      (i.resolved_at is null and now() > i.sla_due_at)
    );

  select count(*) into v_chronic_count
  from (
    select category from incidents
    where site_id = p_site_id and created_at >= p_week_start and created_at < v_week_end and category is not null
    group by category having count(*) >= 3
  ) c;

  v_helpdesk_score := greatest(0, round(100 - least(v_breach_count * 10, 50) - least(v_chronic_count * 7, 30), 1));

  v_composite := round((v_esl_score + v_kiosk_score + v_network_score + v_helpdesk_score) / 4, 1);
  v_letter := case when v_composite >= 85 then 'A' when v_composite >= 70 then 'B' else 'C' end;

  return query select v_esl_score, v_kiosk_score, v_network_score, v_helpdesk_score, v_composite, v_letter,
    v_esl_offline_pct, v_kiosk_uptime, v_network_downtime_min, v_call_count, v_breach_count;
end;
$$;

create or replace function generate_weekly_store_health_scores(p_tenant_id uuid, p_week_start date default null)
returns int
language plpgsql
as $$
declare
  v_week_start date := coalesce(p_week_start, date_trunc('week', current_date)::date);
  v_site record;
  v_result record;
  v_count int := 0;
begin
  for v_site in select id from sites where tenant_id = p_tenant_id loop
    select * into v_result from compute_store_health_score(v_site.id, v_week_start);
    insert into store_health_scores (
      tenant_id, site_id, week_start, esl_score, kiosk_score, network_score, helpdesk_score,
      composite_score, letter_grade, esl_offline_pct, kiosk_uptime_pct, network_downtime_minutes,
      helpdesk_call_count, helpdesk_sla_breach_count
    ) values (
      p_tenant_id, v_site.id, v_week_start, v_result.esl_score, v_result.kiosk_score, v_result.network_score,
      v_result.helpdesk_score, v_result.composite_score, v_result.letter_grade, v_result.esl_offline_pct,
      v_result.kiosk_uptime_pct, v_result.network_downtime_minutes, v_result.helpdesk_call_count, v_result.helpdesk_sla_breach_count
    )
    on conflict (site_id, week_start) do update set
      esl_score = excluded.esl_score, kiosk_score = excluded.kiosk_score, network_score = excluded.network_score,
      helpdesk_score = excluded.helpdesk_score, composite_score = excluded.composite_score, letter_grade = excluded.letter_grade,
      esl_offline_pct = excluded.esl_offline_pct, kiosk_uptime_pct = excluded.kiosk_uptime_pct,
      network_downtime_minutes = excluded.network_downtime_minutes, helpdesk_call_count = excluded.helpdesk_call_count,
      helpdesk_sla_breach_count = excluded.helpdesk_sla_breach_count, computed_at = now();
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function get_store_health_scores(p_tenant_id uuid, p_week_start date default null)
returns table (
  site_id uuid, site_name text, week_start date,
  esl_score numeric, kiosk_score numeric, network_score numeric, helpdesk_score numeric,
  composite_score numeric, letter_grade text,
  esl_offline_pct numeric, kiosk_uptime_pct numeric, network_downtime_minutes int,
  helpdesk_call_count int, helpdesk_sla_breach_count int
)
language plpgsql
stable
as $$
declare
  v_role user_role;
  v_caller_site uuid;
  v_allowed_site_ids uuid[];
  v_week date := coalesce(p_week_start, date_trunc('week', current_date)::date);
begin
  v_role := current_user_role();
  select up.site_id into v_caller_site from user_profiles up where up.id = current_profile_id();

  if v_role in ('tenant_admin', 'agent') or (v_role = 'manager' and v_caller_site is null) then
    select array_agg(s.id) into v_allowed_site_ids from sites s where s.tenant_id = p_tenant_id;
  else
    with recursive descendants as (
      select s.id from sites s where s.id = v_caller_site and s.tenant_id = p_tenant_id
      union all
      select s.id from sites s join descendants d on s.parent_site_id = d.id
    )
    select array_agg(id) into v_allowed_site_ids from descendants;
  end if;

  return query
  select sh.site_id, s.name, sh.week_start, sh.esl_score, sh.kiosk_score, sh.network_score, sh.helpdesk_score,
    sh.composite_score, sh.letter_grade, sh.esl_offline_pct, sh.kiosk_uptime_pct, sh.network_downtime_minutes,
    sh.helpdesk_call_count, sh.helpdesk_sla_breach_count
  from store_health_scores sh
  join sites s on s.id = sh.site_id
  where sh.tenant_id = p_tenant_id and sh.week_start = v_week and sh.site_id = any(v_allowed_site_ids)
  order by s.name;
end;
$$;
