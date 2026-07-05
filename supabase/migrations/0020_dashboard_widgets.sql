-- ============================================================
-- HelpFix — 0020_dashboard_widgets.sql
-- Cila: Raporlama & Analitik'e Dashboard Tasarımcısı. Her kullanıcı
-- kendi widget setini seçip sıralayabilir.
-- ============================================================

create table dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  widget_type text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_dashboard_widgets_user on dashboard_widgets(user_id);

alter table dashboard_widgets enable row level security;

create policy dashboard_widgets_select on dashboard_widgets
  for select using (user_id = current_profile_id());

create policy dashboard_widgets_write on dashboard_widgets
  for all using (user_id = current_profile_id())
  with check (user_id = current_profile_id() and tenant_id = current_tenant_id());
