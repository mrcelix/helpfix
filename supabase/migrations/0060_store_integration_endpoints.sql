-- ============================================================
-- HelpFix — 0060_store_integration_endpoints.sql
-- Faz CA: Mağaza Performansı — Entegrasyon Yönetimi.
--
-- Faz BN'deki store-health-integration webhook'u DIŞARIDAN İÇERİYE
-- (push) çalışıyordu — dış sistem HelpFix'e veri gönderiyordu. Bu faz
-- bunun TAMAMLAYICISI: HelpFix'in kendisinin, tanımlı JSON/WebAPI uç
-- noktalarını BELİRLİ ARALIKLARLA (poll_interval_minutes) çağırıp
-- (içeriden dışarıya / pull) mağazadaki varlıkların durumunu çekmesini
-- sağlayan bir altyapı — Admin Panel'den yönetilir, her çalıştırma
-- servis logu/hata kaydı olarak saklanır.
-- ============================================================

create type integration_log_status as enum ('success', 'error', 'partial');

create table integration_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  endpoint_url text not null,
  http_method text not null default 'GET',
  auth_header_name text,
  auth_header_value text,
  poll_interval_minutes int not null default 15 check (poll_interval_minutes >= 1),
  is_active boolean not null default true,
  last_synced_at timestamptz,
  last_status integration_log_status,
  created_by uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_integration_endpoints_tenant on integration_endpoints(tenant_id);
create index idx_integration_endpoints_site on integration_endpoints(site_id);

create table integration_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  endpoint_id uuid not null references integration_endpoints(id) on delete cascade,
  status integration_log_status not null,
  http_status int,
  duration_ms int,
  devices_updated int not null default 0,
  message text,
  created_at timestamptz not null default now()
);

create index idx_integration_logs_endpoint on integration_logs(endpoint_id, created_at desc);
create index idx_integration_logs_tenant on integration_logs(tenant_id, created_at desc);

alter table integration_endpoints enable row level security;
alter table integration_logs enable row level security;

create policy integration_endpoints_select on integration_endpoints
  for select using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'));

create policy integration_endpoints_write on integration_endpoints
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

create policy integration_logs_select on integration_logs
  for select using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'));

-- integration_logs'a INSERT politikası bilinçli olarak yok — sadece
-- store-integration-sync Edge Function'ı (service_role ile, RLS'i
-- atlayarak) log yazar. Kullanıcılar doğrudan log üretemez.

create or replace function get_integration_summary(p_tenant_id uuid)
returns table (
  site_id uuid,
  site_name text,
  active_endpoints int,
  last_synced_at timestamptz,
  last_status integration_log_status
)
language sql
stable
as $$
  select
    s.id,
    s.name,
    count(ie.id) filter (where ie.is_active) ::int,
    max(ie.last_synced_at),
    (array_agg(ie.last_status order by ie.last_synced_at desc nulls last))[1]
  from sites s
  left join integration_endpoints ie on ie.site_id = s.id
  where s.tenant_id = p_tenant_id
  group by s.id, s.name
  having count(ie.id) > 0
  order by s.name;
$$;

-- Çalışan Merkezi > Mağazam sayfası için — çağıranın KENDİ profiline
-- atanmış mağazanın entegrasyon özetini döndürür. SECURITY DEFINER,
-- çünkü requester rolü integration_endpoints'i doğrudan okuyamaz
-- (RLS sadece agent+ görebilir) — bu fonksiyon sadece çağıranın
-- KENDİ sitesine ait toplu/anonim bir özet döndürerek bunu güvenle
-- aşıyor, ham uç nokta verisini (URL, auth header) hiç açığa çıkarmaz.
create or replace function get_my_store_integration_status()
returns table (
  active_endpoints int,
  last_synced_at timestamptz,
  last_status integration_log_status
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_site_id uuid;
begin
  select site_id into v_site_id from user_profiles where id = current_profile_id();
  if v_site_id is null then
    return;
  end if;

  return query
  select
    count(ie.id) filter (where ie.is_active)::int,
    max(ie.last_synced_at),
    (array_agg(ie.last_status order by ie.last_synced_at desc nulls last))[1]
  from integration_endpoints ie
  where ie.site_id = v_site_id;
end;
$$;
