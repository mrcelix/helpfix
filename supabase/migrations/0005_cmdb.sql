-- ============================================================
-- HelpFix — 0005_cmdb.sql
-- Varlık & CMDB: konfigürasyon öğeleri (CI), aralarındaki bağımlılık
-- ilişkileri, ve diğer modüllerle çapraz bağlantı (incidents.ci_id).
-- ============================================================

create type ci_type as enum (
  'server', 'laptop', 'desktop', 'network_device', 'software_license', 'mobile_device', 'other'
);
create type ci_status as enum ('active', 'in_repair', 'retired', 'unmanaged');
create type ci_relationship_type as enum ('depends_on', 'hosted_on', 'connected_to');

create table configuration_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  tag text not null, -- görüntü etiketi, örn. AST-000101 (trigger ile üretilir)
  name text not null,
  ci_type ci_type not null default 'other',
  status ci_status not null default 'active',
  serial_number text,
  assigned_user_id uuid references user_profiles(id),
  vendor text,
  cost numeric(12, 2),
  purchase_date date,
  warranty_expiry date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_ci_tenant_serial on configuration_items(tenant_id, serial_number) where serial_number is not null;
create index idx_ci_tenant on configuration_items(tenant_id);
create index idx_ci_assigned on configuration_items(assigned_user_id);
create index idx_ci_warranty on configuration_items(tenant_id, warranty_expiry);

create sequence ci_tag_seq;

create or replace function set_ci_tag()
returns trigger
language plpgsql
as $$
begin
  if new.tag is null or new.tag = '' then
    new.tag := 'AST-' || lpad(nextval('ci_tag_seq')::text, 6, '0');
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_ci_tag
  before insert on configuration_items
  for each row execute function set_ci_tag();

create trigger trg_ci_touch
  before update on configuration_items
  for each row execute function touch_updated_at();

-- ---------- İLİŞKİLER (basit bağımlılık grafiği) ----------
create table ci_relationships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  source_ci_id uuid not null references configuration_items(id) on delete cascade,
  target_ci_id uuid not null references configuration_items(id) on delete cascade,
  relationship_type ci_relationship_type not null default 'depends_on',
  created_at timestamptz not null default now(),
  check (source_ci_id <> target_ci_id)
);

create index idx_ci_rel_source on ci_relationships(source_ci_id);
create index idx_ci_rel_target on ci_relationships(target_ci_id);

-- ---------- ÇAPRAZ MODÜL BAĞLANTISI ----------
-- Bir olay/problem/değişiklik belirli bir varlıkla ilişkilendirilebilir.
-- Mockup'taki "Bağlı Modüller" konseptinin veritabanı temeli.
alter table incidents add column ci_id uuid references configuration_items(id);
alter table problems add column ci_id uuid references configuration_items(id);
alter table changes add column ci_id uuid references configuration_items(id);

create index idx_incidents_ci on incidents(ci_id);
create index idx_problems_ci on problems(ci_id);
create index idx_changes_ci on changes(ci_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table configuration_items enable row level security;
alter table ci_relationships enable row level security;

-- Varlıklar tenant içindeki herkes tarafından görülebilir (bir çalışan
-- kendisine zimmetli cihazı görebilmeli — Çalışan Merkezi ileride bunu
-- okuyacak). Yazma sadece agent/manager/admin.
create policy ci_select on configuration_items
  for select using (tenant_id = current_tenant_id());

create policy ci_write on configuration_items
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  )
  with check (tenant_id = current_tenant_id());

create policy ci_relationships_select on ci_relationships
  for select using (tenant_id = current_tenant_id());

create policy ci_relationships_write on ci_relationships
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  )
  with check (tenant_id = current_tenant_id());
