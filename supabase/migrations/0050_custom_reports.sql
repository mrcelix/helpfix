-- ============================================================
-- HelpFix — 0050_custom_reports.sql
-- Faz BL: Özel Rapor Oluşturucu.
--
-- Kapsam: kullanıcının veri kaynağı (Servis Masası/Problem/Değişiklik/
-- Katalog Talebi) + gruplama boyutu (kategori/öncelik/durum/atanan/
-- hafta) + tarih aralığı seçerek kendi raporunu oluşturup
-- kaydedebildiği basit bir rapor tanımı deposu. Hesaplama (gruplama/
-- sayma) istemci tarafında yapılır — bu tablo sadece rapor TANIMINI
-- saklar, sonucu değil (her açıldığında güncel veriyle hesaplanır).
--
-- KASITLI KAPSAM DIŞI: Zamanlanmış e-posta raporu — bunun için
-- gerçek bir e-posta gönderim sağlayıcısı (Postmark/Resend/Mailgun,
-- Faz AZ'deki gelen kutusu kurulumuna benzer ama GİDEN e-posta için)
-- ve zamanlayıcı (pg_cron ya da harici cron) gerekir; bu Supabase
-- dışı bir kurulum adımı olduğu için bu faza dahil edilmedi.
-- ============================================================

create table custom_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  created_by uuid not null references user_profiles(id) on delete cascade,
  name text not null,
  data_source text not null check (data_source in ('incidents', 'problems', 'changes', 'service_requests')),
  group_by text not null check (group_by in ('category', 'priority', 'status', 'assignee', 'week')),
  date_range_days int not null default 30,
  created_at timestamptz not null default now()
);

create index idx_custom_reports_tenant on custom_reports(tenant_id);

alter table custom_reports enable row level security;

create policy custom_reports_select on custom_reports
  for select using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent'));

create policy custom_reports_insert on custom_reports
  for insert with check (
    tenant_id = current_tenant_id()
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
    and created_by = current_profile_id()
  );

create policy custom_reports_delete on custom_reports
  for delete using (
    tenant_id = current_tenant_id()
    and (created_by = current_profile_id() or current_user_role() in ('tenant_admin', 'manager'))
  );
