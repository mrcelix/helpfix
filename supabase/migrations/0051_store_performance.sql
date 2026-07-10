-- ============================================================
-- HelpFix — 0051_store_performance.sql
-- Faz BM: Mağaza Performansı — BT hizmetlerinin mağaza/şube bazlı
-- skorlanması, SLA takibi ve envanter online/offline durumu.
--
-- Bu migration Faz BJ'deki (0048) `sites` tablosunu genişletir:
--   1) sites.parent_site_id — bölge yöneticisi → bağlı mağazalar
--      hiyerarşisi (bir "bölge" düğümünün alt mağazaları olur).
--   2) sites.manager_id — bu siteden sorumlu kişi (mağaza müdürü ya
--      da bölge yöneticisi). "Bir üst yönetici bağlı mağazaları toplu
--      halde görebilmeli" ihtiyacı buradan çözülüyor.
--
-- Envanter online/offline: configuration_items.is_online +
-- last_seen_at eklendi (CMDB'de manuel/entegrasyon ile güncellenir —
-- gerçek ajan/heartbeat entegrasyonu bu fazın kapsamı dışında,
-- şimdilik CI Drawer'dan elle işaretleniyor).
--
-- Skor hesaplaması CANLI (get_store_scorecard RPC'si, saklanmaz) —
-- Özel Rapor Oluşturucu'daki (Faz BL) "her açılışta güncel veri"
-- felsefesiyle tutarlı. Geçmiş raporlama için ise günlük anlık
-- görüntüler (store_score_snapshots) saklanıyor — capture_store_
-- score_snapshots() fonksiyonu admin panelinden manuel tetiklenir
-- (otomatik günlük çalıştırma için pg_cron kurulumu Supabase
-- panelinden ayrıca yapılmalı, bu migration'ın kapsamı dışında).
-- ============================================================

alter table sites add column parent_site_id uuid references sites(id) on delete set null;
alter table sites add column manager_id uuid references user_profiles(id) on delete set null;

create index idx_sites_parent on sites(parent_site_id);

alter table configuration_items add column is_online boolean not null default true;
alter table configuration_items add column last_seen_at timestamptz not null default now();

create table store_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  snapshot_date date not null,
  score numeric(5, 1) not null,
  sla_compliant_pct numeric(5, 1) not null,
  online_pct numeric(5, 1) not null,
  open_incidents int not null default 0,
  critical_open_incidents int not null default 0,
  created_at timestamptz not null default now(),
  unique (site_id, snapshot_date)
);

create index idx_store_snapshots_site_date on store_score_snapshots(site_id, snapshot_date);

alter table store_score_snapshots enable row level security;

create policy store_score_snapshots_select on store_score_snapshots
  for select using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'));

create policy store_score_snapshots_write on store_score_snapshots
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

create or replace function get_store_scorecard(p_tenant_id uuid)
returns table (
  site_id uuid,
  site_name text,
  parent_site_id uuid,
  is_headquarters boolean,
  total_devices int,
  online_devices int,
  online_pct numeric,
  open_incidents int,
  critical_open_incidents int,
  sla_compliant_pct numeric,
  score numeric
)
language plpgsql
stable
as $$
declare
  v_role user_role;
  v_caller_site uuid;
  v_allowed_site_ids uuid[];
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
  select
    s.id,
    s.name,
    s.parent_site_id,
    s.is_headquarters,
    coalesce(dev.total, 0)::int,
    coalesce(dev.online, 0)::int,
    case when coalesce(dev.total, 0) = 0 then 100 else round(dev.online::numeric / dev.total * 100, 1) end,
    coalesce(inc.open_count, 0)::int,
    coalesce(inc.critical_open, 0)::int,
    case when coalesce(inc.resolved_count, 0) = 0 then 100
         else round((inc.resolved_count - inc.breached_count)::numeric / inc.resolved_count * 100, 1) end,
    round(
      (case when coalesce(inc.resolved_count, 0) = 0 then 100
            else (inc.resolved_count - inc.breached_count)::numeric / inc.resolved_count * 100 end) * 0.4
      + (case when coalesce(dev.total, 0) = 0 then 100 else dev.online::numeric / dev.total * 100 end) * 0.3
      + greatest(0, 100 - coalesce(inc.critical_open, 0) * 20) * 0.3
    , 1)
  from sites s
  left join lateral (
    select count(*) as total, count(*) filter (where ci.is_online) as online
    from configuration_items ci
    where ci.site_id = s.id and ci.status != 'retired'
  ) dev on true
  left join lateral (
    select
      count(*) filter (where i.status not in ('resolved', 'closed', 'merged')) as open_count,
      count(*) filter (where i.status not in ('resolved', 'closed', 'merged') and i.priority = 'P1') as critical_open,
      count(*) filter (where i.status in ('resolved', 'closed') and i.resolved_at is not null and i.created_at >= now() - interval '30 days') as resolved_count,
      count(*) filter (where i.status in ('resolved', 'closed') and i.resolved_at is not null and i.sla_due_at is not null and i.resolved_at > i.sla_due_at and i.created_at >= now() - interval '30 days') as breached_count
    from incidents i
    where i.site_id = s.id
  ) inc on true
  where s.tenant_id = p_tenant_id and s.id = any(v_allowed_site_ids)
  order by s.name;
end;
$$;

create or replace function capture_store_score_snapshots(p_tenant_id uuid)
returns int
language plpgsql
as $$
declare
  v_count int;
begin
  insert into store_score_snapshots (tenant_id, site_id, snapshot_date, score, sla_compliant_pct, online_pct, open_incidents, critical_open_incidents)
  select p_tenant_id, gc.site_id, current_date, gc.score, gc.sla_compliant_pct, gc.online_pct, gc.open_incidents, gc.critical_open_incidents
  from get_store_scorecard(p_tenant_id) gc
  on conflict (site_id, snapshot_date) do update set
    score = excluded.score,
    sla_compliant_pct = excluded.sla_compliant_pct,
    online_pct = excluded.online_pct,
    open_incidents = excluded.open_incidents,
    critical_open_incidents = excluded.critical_open_incidents;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
