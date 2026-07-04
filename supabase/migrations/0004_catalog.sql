-- ============================================================
-- HelpFix — 0004_catalog.sql
-- Servis Kataloğu & Talep: kategoriler, katalog öğeleri, talepler.
-- Kataloğ öğeleri tüm tenant kullanıcıları (requester dahil) tarafından
-- görülebilir — bu, gelecekte Çalışan Merkezi'nin bu tabloları
-- doğrudan okuyacağı içindir.
-- ============================================================

create type request_status as enum (
  'submitted',
  'pending_approval',
  'approved',
  'in_procurement',
  'fulfilled',
  'rejected'
);

create table service_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_service_categories_tenant on service_categories(tenant_id);

create table service_catalog_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  category_id uuid references service_categories(id) on delete set null,
  name text not null,
  description text,
  icon text,
  estimated_cost numeric(12, 2),
  estimated_days int,
  requires_approval boolean not null default true,
  approval_threshold numeric(12, 2), -- bu tutarın üzeri ekstra onay gerektirir
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_catalog_items_tenant on service_catalog_items(tenant_id);
create index idx_catalog_items_category on service_catalog_items(category_id);

create sequence request_ref_seq;

create table service_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ref text not null unique,
  catalog_item_id uuid not null references service_catalog_items(id),
  requester_id uuid not null references user_profiles(id),
  requested_for_id uuid references user_profiles(id), -- "başkası için" talep
  status request_status not null default 'submitted',
  notes text,
  approver_id uuid references user_profiles(id),
  approval_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fulfilled_at timestamptz
);

create index idx_service_requests_tenant on service_requests(tenant_id);
create index idx_service_requests_requester on service_requests(requester_id);
create index idx_service_requests_status on service_requests(tenant_id, status);

create or replace function set_request_ref()
returns trigger
language plpgsql
as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := 'REQ-' || lpad(nextval('request_ref_seq')::text, 6, '0');
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_request_ref
  before insert on service_requests
  for each row execute function set_request_ref();

create trigger trg_request_touch
  before update on service_requests
  for each row execute function touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table service_categories enable row level security;
alter table service_catalog_items enable row level security;
alter table service_requests enable row level security;

-- Kategoriler ve katalog öğeleri: tenant içindeki HERKES görebilir
-- (requester dahil — Çalışan Merkezi kataloğu tarayacak).
create policy service_categories_select on service_categories
  for select using (tenant_id = current_tenant_id());

create policy service_categories_write on service_categories
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager')
  )
  with check (tenant_id = current_tenant_id());

create policy catalog_items_select on service_catalog_items
  for select using (tenant_id = current_tenant_id());

create policy catalog_items_write on service_catalog_items
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager')
  )
  with check (tenant_id = current_tenant_id());

-- Talepler: requester sadece kendi (veya kendisi için oluşturduğu)
-- taleplerini görür; agent/manager/admin tüm tenant'ı görür.
create policy service_requests_select on service_requests
  for select using (
    tenant_id = current_tenant_id()
    and (
      current_user_role() in ('tenant_admin', 'manager', 'agent')
      or requester_id = current_profile_id()
    )
  );

create policy service_requests_insert on service_requests
  for insert with check (
    tenant_id = current_tenant_id() and requester_id = current_profile_id()
  );

create policy service_requests_update on service_requests
  for update using (
    tenant_id = current_tenant_id()
    and (
      current_user_role() in ('tenant_admin', 'manager', 'agent')
      or requester_id = current_profile_id()
    )
  )
  with check (tenant_id = current_tenant_id());

-- ============================================================
-- SEED — birkaç örnek kategori/öğe (tenant kurulumu kolaylaşsın diye)
-- ============================================================
-- Not: gerçek kullanım için tenant_id'yi kendi tenant'ınızla değiştirip
-- çalıştırın, ya da Tenant Admin panelinden manuel ekleyin.
-- insert into service_categories (tenant_id, name, icon, sort_order) values
--   ('YOUR_TENANT_ID', 'Donanım', 'laptop', 1),
--   ('YOUR_TENANT_ID', 'Yazılım & Lisans', 'package', 2),
--   ('YOUR_TENANT_ID', 'Erişim Talepleri', 'key', 3);
