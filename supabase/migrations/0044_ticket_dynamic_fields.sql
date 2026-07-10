-- ============================================================
-- HelpFix — 0044_ticket_dynamic_fields.sql
-- Faz BE: Dinamik Form Alanları.
--
-- İki parça:
--   1) Servis Kataloğu'nda form_schema alanı zaten (Faz BD öncesinden)
--      tanımlıydı ve RequestServiceModal onu render ediyordu — ama
--      admin panelinde onu DOLDURACAK bir arayüz hiç yoktu (yani
--      özellik koddan render ediliyordu ama hiçbir zaman veri
--      alamıyordu). Bu, sadece frontend değişikliği ile çözüldü,
--      migration gerekmiyor.
--   2) Servis Masası taleplerine de aynı desende kategoriye özel
--      dinamik alan desteği ekleniyor (bu migration'ın konusu).
-- ============================================================

alter table incidents add column custom_fields jsonb not null default '{}'::jsonb;

create table ticket_category_fields (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  category_key text not null, -- ticket-categories.ts'deki taksonomi anahtarıyla eşleşir (hardware/network/vb.)
  field_schema jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index idx_ticket_category_fields_tenant_key on ticket_category_fields(tenant_id, category_key);

alter table ticket_category_fields enable row level security;

create policy ticket_category_fields_select on ticket_category_fields
  for select using (tenant_id = current_tenant_id());

create policy ticket_category_fields_write on ticket_category_fields
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());
