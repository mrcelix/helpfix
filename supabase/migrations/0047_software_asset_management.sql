-- ============================================================
-- HelpFix — 0047_software_asset_management.sql
-- Faz BI: Yazılım Varlık Yönetimi (SAM).
--
-- CMDB'de 'software_license' bir CI tipi olarak zaten vardı ama
-- koltuk sayısı / kullanım / uyumluluk kavramı hiç yoktu. Bu migration
-- ayrı bir lisans havuzu modeli kurar: bir lisans N koltuğa sahiptir,
-- her koltuk bir kullanıcıya veya bir CI'a (cihaza) atanabilir.
-- Uyumluluk (used_seats > total_seats ise ihlal) ve kullanılmayan
-- koltuk maliyeti UI tarafında hesaplanır — burada sadece veri modeli.
-- ============================================================

create type license_type as enum ('subscription', 'perpetual', 'oem', 'open_source');

create table software_licenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  vendor_id uuid references vendors(id) on delete set null,
  license_type license_type not null default 'subscription',
  total_seats int not null default 1 check (total_seats >= 0),
  cost_per_seat numeric(12, 2),
  currency text not null default 'TRY',
  renewal_date date,
  contract_id uuid references contracts(id) on delete set null, -- ilgili sözleşmeye bağlanabilir (Faz BH)
  notes text,
  created_at timestamptz not null default now()
);

create index idx_software_licenses_tenant on software_licenses(tenant_id);

-- Bir koltuk ya bir KULLANICIYA ya da bir CİHAZA (CI) atanır — ikisi
-- birden değil. En az biri dolu olmalı.
create table software_license_assignments (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references software_licenses(id) on delete cascade,
  user_id uuid references user_profiles(id) on delete cascade,
  ci_id uuid references configuration_items(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  check (
    (user_id is not null and ci_id is null) or (user_id is null and ci_id is not null)
  )
);

create index idx_sla_license on software_license_assignments(license_id);
create unique index idx_sla_license_user on software_license_assignments(license_id, user_id) where user_id is not null;
create unique index idx_sla_license_ci on software_license_assignments(license_id, ci_id) where ci_id is not null;

-- ============================================================
-- ROW LEVEL SECURITY — aynı desen: görüntüleme agent+, yazma yönetici.
-- ============================================================
alter table software_licenses enable row level security;
alter table software_license_assignments enable row level security;

create policy software_licenses_select on software_licenses
  for select using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'));
create policy software_licenses_write on software_licenses
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

create policy software_license_assignments_select on software_license_assignments
  for select using (
    exists (select 1 from software_licenses sl where sl.id = software_license_assignments.license_id and sl.tenant_id = current_tenant_id())
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );
create policy software_license_assignments_write on software_license_assignments
  for all using (
    exists (select 1 from software_licenses sl where sl.id = software_license_assignments.license_id and sl.tenant_id = current_tenant_id())
    and current_user_role() in ('tenant_admin', 'manager')
  );
