-- ============================================================
-- HelpFix — 0056_asset_management_upgrade.sql
-- Faz BS: Snipe-IT analizinden CMDB'ye taşınan özellikler.
--
--   1) Varlık Modelleri (asset_models) — "Dell Latitude 5440" gibi
--      şablonlar tanımlayıp yeni cihazları hızlıca oluşturma.
--   2) Checkout/Checkin iş akışı + geçmişi (ci_checkout_history) —
--      "Atanan Kullanıcı" alanını sessizce değiştirmek yerine, kim
--      ne zaman teslim aldı/etti kaydı tutan gerçek bir iş akışı.
--   3) Sarf Malzemeleri & Aksesuarlar (consumable_items +
--      consumable_checkouts) — toner/kablo gibi tüketilen ya da
--      mouse/klavye gibi iade edilen, miktar bazlı envanter.
--      is_returnable=false → sarf malzemesi (tüketilir, geri dönmez)
--      is_returnable=true  → aksesuar (checkout/checkin ile döner)
--   4) Varlıklara özel alanlar (custom_fields + ci_type_fields) —
--      Faz BE'deki dinamik alan deseninin CMDB'ye taşınmış hali.
-- ============================================================

create table asset_models (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  manufacturer text,
  ci_type ci_type not null default 'other',
  notes text,
  created_at timestamptz not null default now()
);

create index idx_asset_models_tenant on asset_models(tenant_id);

alter table configuration_items add column model_id uuid references asset_models(id) on delete set null;
alter table configuration_items add column custom_fields jsonb not null default '{}'::jsonb;

create table ci_type_fields (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ci_type ci_type not null,
  field_schema jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index idx_ci_type_fields_tenant_type on ci_type_fields(tenant_id, ci_type);

create table ci_checkout_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ci_id uuid not null references configuration_items(id) on delete cascade,
  checked_out_to uuid references user_profiles(id) on delete set null,
  checked_out_by uuid references user_profiles(id) on delete set null,
  checked_out_at timestamptz not null default now(),
  checked_in_at timestamptz,
  checked_in_by uuid references user_profiles(id) on delete set null,
  notes text
);

create index idx_ci_checkout_history_ci on ci_checkout_history(ci_id, checked_out_at);

create table consumable_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  category text,
  is_returnable boolean not null default false,
  total_quantity int not null default 0 check (total_quantity >= 0),
  low_stock_threshold int not null default 5,
  unit_cost numeric(10, 2),
  vendor_id uuid references vendors(id) on delete set null,
  site_id uuid references sites(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_consumable_items_tenant on consumable_items(tenant_id);

create table consumable_checkouts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  consumable_id uuid not null references consumable_items(id) on delete cascade,
  user_id uuid references user_profiles(id) on delete set null,
  quantity int not null default 1 check (quantity > 0),
  checked_out_by uuid references user_profiles(id) on delete set null,
  checked_out_at timestamptz not null default now(),
  checked_in_at timestamptz
);

create index idx_consumable_checkouts_item on consumable_checkouts(consumable_id, checked_out_at);

alter table asset_models enable row level security;
alter table ci_type_fields enable row level security;
alter table ci_checkout_history enable row level security;
alter table consumable_items enable row level security;
alter table consumable_checkouts enable row level security;

create policy asset_models_select on asset_models for select using (tenant_id = current_tenant_id());
create policy asset_models_write on asset_models
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

create policy ci_type_fields_select on ci_type_fields for select using (tenant_id = current_tenant_id());
create policy ci_type_fields_write on ci_type_fields
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

create policy ci_checkout_history_select on ci_checkout_history for select using (tenant_id = current_tenant_id());
create policy ci_checkout_history_write on ci_checkout_history
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'))
  with check (tenant_id = current_tenant_id());

create policy consumable_items_select on consumable_items for select using (tenant_id = current_tenant_id());
create policy consumable_items_write on consumable_items
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

create policy consumable_checkouts_select on consumable_checkouts for select using (tenant_id = current_tenant_id());
create policy consumable_checkouts_write on consumable_checkouts
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'))
  with check (tenant_id = current_tenant_id());
