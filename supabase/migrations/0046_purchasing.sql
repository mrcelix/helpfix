-- ============================================================
-- HelpFix — 0046_purchasing.sql
-- Faz BH: Sözleşme & Satın Alma Yönetimi — tamamen yeni bir modül.
--
-- Kapsam: Tedarikçi kaydı, sözleşme takibi (yenileme hatırlatmalı),
-- satın alma siparişi (PO) akışı (taslak → onay → sipariş → teslim
-- alındı), ve CMDB ile isteğe bağlı bağlantı (bir sözleşme birden
-- fazla varlığı kapsayabilir; bir PO kalemi teslim alındığında bir
-- CI'a bağlanabilir).
-- ============================================================

create type contract_type as enum ('service', 'license', 'maintenance', 'lease', 'other');
create type po_status as enum ('draft', 'pending_approval', 'approved', 'ordered', 'received', 'cancelled');

-- ------------------------------------------------------------
-- TEDARİKÇİLER
-- ------------------------------------------------------------
create table vendors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_vendors_tenant on vendors(tenant_id);

-- ------------------------------------------------------------
-- SÖZLEŞMELER — yenileme hatırlatmalı, isteğe bağlı çoklu varlık bağlantısı
-- ------------------------------------------------------------
create sequence contract_ref_seq;

create table contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ref text not null unique,
  vendor_id uuid references vendors(id) on delete set null,
  name text not null,
  contract_type contract_type not null default 'service',
  start_date date not null,
  end_date date not null,
  cost numeric(14, 2),
  currency text not null default 'TRY',
  auto_renew boolean not null default false,
  renewal_reminder_days int not null default 30,
  notes text,
  owner_id uuid references user_profiles(id),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index idx_contracts_tenant on contracts(tenant_id);
create index idx_contracts_end_date on contracts(tenant_id, end_date);

create or replace function set_contract_ref()
returns trigger
language plpgsql
as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := 'CNT-' || lpad(nextval('contract_ref_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger trg_contract_ref
  before insert on contracts
  for each row execute function set_contract_ref();

-- Bir sözleşme birden fazla varlığı kapsayabilir (örn. "Dell Destek
-- Anlaşması" 12 laptopu kapsar).
create table contract_assets (
  contract_id uuid not null references contracts(id) on delete cascade,
  ci_id uuid not null references configuration_items(id) on delete cascade,
  primary key (contract_id, ci_id)
);

-- ------------------------------------------------------------
-- SATIN ALMA SİPARİŞLERİ (PO)
-- ------------------------------------------------------------
create sequence po_ref_seq;

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ref text not null unique,
  vendor_id uuid references vendors(id) on delete set null,
  title text not null,
  status po_status not null default 'draft',
  total_cost numeric(14, 2) not null default 0,
  currency text not null default 'TRY',
  requested_by uuid not null references user_profiles(id),
  approved_by uuid references user_profiles(id),
  service_request_id uuid references service_requests(id) on delete set null, -- onaylı katalog talebinden izlenebilirlik
  expected_delivery_date date,
  ordered_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_po_tenant on purchase_orders(tenant_id);
create index idx_po_status on purchase_orders(tenant_id, status);

create or replace function set_po_ref()
returns trigger
language plpgsql
as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := 'PO-' || lpad(nextval('po_ref_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger trg_po_ref
  before insert on purchase_orders
  for each row execute function set_po_ref();

create trigger trg_po_touch
  before update on purchase_orders
  for each row execute function touch_updated_at();

create table purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references purchase_orders(id) on delete cascade,
  description text not null,
  quantity int not null default 1,
  unit_cost numeric(14, 2) not null default 0,
  ci_id uuid references configuration_items(id) on delete set null -- teslim alındığında ilgili varlığa bağlanabilir
);

create index idx_po_items_po on purchase_order_items(po_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Görüntüleme: agent+ (maliyet bilgisi requester'lara açık değil).
-- Yazma: sadece tenant_admin/manager (satın alma kararı).
-- ============================================================
alter table vendors enable row level security;
alter table contracts enable row level security;
alter table contract_assets enable row level security;
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;

create policy vendors_select on vendors
  for select using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'));
create policy vendors_write on vendors
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

create policy contracts_select on contracts
  for select using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'));
create policy contracts_write on contracts
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

create policy contract_assets_select on contract_assets
  for select using (
    exists (select 1 from contracts c where c.id = contract_assets.contract_id and c.tenant_id = current_tenant_id())
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );
create policy contract_assets_write on contract_assets
  for all using (
    exists (select 1 from contracts c where c.id = contract_assets.contract_id and c.tenant_id = current_tenant_id())
    and current_user_role() in ('tenant_admin', 'manager')
  );

create policy purchase_orders_select on purchase_orders
  for select using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'));
create policy purchase_orders_write on purchase_orders
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

create policy purchase_order_items_select on purchase_order_items
  for select using (
    exists (select 1 from purchase_orders po where po.id = purchase_order_items.po_id and po.tenant_id = current_tenant_id())
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );
create policy purchase_order_items_write on purchase_order_items
  for all using (
    exists (select 1 from purchase_orders po where po.id = purchase_order_items.po_id and po.tenant_id = current_tenant_id())
    and current_user_role() in ('tenant_admin', 'manager')
  );
