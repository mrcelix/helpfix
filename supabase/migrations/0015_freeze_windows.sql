-- ============================================================
-- HelpFix — 0015_freeze_windows.sql
-- Cila: Değişiklik Yönetimi'ne Dondurma Pencereleri (Freeze Windows).
-- Sert bir DB kısıtlaması değil — planlama sırasında UI'da gerçek bir
-- çakışma uyarısı gösterebilmek için sorgulanabilir bir tablo.
-- ============================================================

create table change_freeze_windows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create index idx_freeze_windows_tenant on change_freeze_windows(tenant_id, start_date, end_date);

alter table change_freeze_windows enable row level security;

create policy freeze_windows_select on change_freeze_windows
  for select using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

create policy freeze_windows_write on change_freeze_windows
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager')
  )
  with check (tenant_id = current_tenant_id());
