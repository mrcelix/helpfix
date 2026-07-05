-- ============================================================
-- HelpFix — 0025_change_templates.sql
-- Cila: Değişiklik Yönetimi'ne Standart Şablon Kütüphanesi —
-- sık tekrarlanan, önceden onaylı değişiklikler için hazır şablonlar
-- (örn. "Sunucu Yeniden Başlatma", "SSL Sertifikası Yenileme").
-- ============================================================

create table change_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  category text,
  default_risk_score int not null default 10,
  default_rollback_plan text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table change_templates enable row level security;

create policy change_templates_select on change_templates
  for select using (tenant_id = current_tenant_id());

create policy change_templates_write on change_templates
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager')
  )
  with check (tenant_id = current_tenant_id());
