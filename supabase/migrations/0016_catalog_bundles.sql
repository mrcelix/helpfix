-- ============================================================
-- HelpFix — 0016_catalog_bundles.sql
-- Cila: Servis Kataloğu'na Hizmet Paketleri (örn. "Yeni İşe Alım
-- Paketi" = dizüstü + e-posta + Slack erişimi tek talepte) ve Koşullu
-- Form Mantığı (form_schema jsonb — bir alanın değerine göre başka
-- alanların gösterilmesi).
-- ============================================================

-- Koşullu form mantığı için: her katalog öğesine opsiyonel bir
-- form_schema tanımlanabilir. Örnek şema:
-- {"fields":[
--   {"key":"device_type","label":"Cihaz Tipi","type":"select","options":["Laptop","Monitör"]},
--   {"key":"ram","label":"RAM Tercihi","type":"select","options":["8GB","16GB"],"showIf":{"field":"device_type","equals":"Laptop"}}
-- ]}
alter table service_catalog_items add column form_schema jsonb;
alter table service_requests add column form_data jsonb;

-- ---------- HİZMET PAKETLERİ ----------
create table service_bundles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table service_bundle_items (
  bundle_id uuid not null references service_bundles(id) on delete cascade,
  catalog_item_id uuid not null references service_catalog_items(id) on delete cascade,
  primary key (bundle_id, catalog_item_id)
);

-- Bir paket talep edildiğinde oluşan tüm talepleri birbirine bağlar
-- (Taleplerim ekranında "aynı paketten" olarak gruplanabilsin diye).
alter table service_requests add column bundle_request_batch_id uuid;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table service_bundles enable row level security;
alter table service_bundle_items enable row level security;

-- Paketler tenant içindeki herkese açık (requester dahil — kataloğu tarayacak).
create policy bundles_select on service_bundles
  for select using (tenant_id = current_tenant_id());

create policy bundles_write on service_bundles
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager')
  )
  with check (tenant_id = current_tenant_id());

create policy bundle_items_select on service_bundle_items
  for select using (
    exists (select 1 from service_bundles b where b.id = service_bundle_items.bundle_id and b.tenant_id = current_tenant_id())
  );

create policy bundle_items_write on service_bundle_items
  for all using (
    exists (
      select 1 from service_bundles b
      where b.id = service_bundle_items.bundle_id
        and b.tenant_id = current_tenant_id()
        and current_user_role() in ('tenant_admin', 'manager')
    )
  );
