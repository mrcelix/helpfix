-- ============================================================
-- HelpFix — 0013_admin.sql
-- Tenant Admin: modül aç/kapa bayrakları. departments tablosu zaten
-- 0001_init.sql'de vardı ama hiç kullanılmamıştı — bu migration'ın
-- eklediği tek şey feature flag tablosu; Kullanıcılar ve Departmanlar
-- sekmeleri mevcut tabloları kullanır.
-- ============================================================

create table tenant_feature_flags (
  tenant_id uuid not null references tenants(id) on delete cascade,
  module_code text not null, -- nav-modules.ts'teki 'code' değeriyle eşleşir
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, module_code)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table tenant_feature_flags enable row level security;

-- Herkes okuyabilir (sidebar için gerekli), sadece admin yazabilir.
create policy feature_flags_select on tenant_feature_flags
  for select using (tenant_id = current_tenant_id());

create policy feature_flags_write on tenant_feature_flags
  for all using (
    tenant_id = current_tenant_id() and current_user_role() = 'tenant_admin'
  )
  with check (tenant_id = current_tenant_id());

-- departments tablosunun manager_id güncellemesi için ek bir RLS notu:
-- 0001_init.sql'deki departments_write politikası zaten tenant_admin'e
-- yazma izni veriyor, ek bir şey gerekmiyor.
