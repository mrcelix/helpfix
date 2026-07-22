-- ============================================================
-- HelpFix — 0070_dashboard_widgets.sql
--
-- Admin Panel üzerinden yönetilebilen menü özelleştirme + widget
-- yerleşimi. Tenant-geneli ayarlar — tek admin düzenler, o tenant'taki
-- herkes aynı düzeni görür (mevcut tenant_feature_flags / marka
-- renkleri ile aynı model).
-- ============================================================

-- --------------------------------------------------------------
-- 1) MENÜ ÖZELLEŞTİRME — tenant_feature_flags'i genişlet
-- --------------------------------------------------------------
-- display_order: null → nav-modules.ts'teki dizi sırası kullanılır.
-- min_role: null → herkese açık; dolu ise o rol ve üzeri görür
--   (hiyerarşi: requester < agent < manager < tenant_admin).
-- custom_name: null → nav-modules.ts'teki varsayılan çok dilli ad;
--   dolu ise {tr,en,fr,it,ar} şeklinde jsonb, eksik diller varsayılana
--   düşer.
-- custom_icon: null → nav-modules.ts'teki varsayılan ikon; dolu ise
--   uygulamadaki ICON_MAP anahtarlarından biri (lucide-react ikon adı).
alter table tenant_feature_flags
  add column display_order int,
  add column min_role text check (min_role in ('requester', 'agent', 'manager', 'tenant_admin')),
  add column custom_name jsonb,
  add column custom_icon text;

-- --------------------------------------------------------------
-- 2) WIDGET YERLEŞİMİ — dashboard grid pozisyonları
-- --------------------------------------------------------------
create table tenant_dashboard_layouts (
  tenant_id uuid not null references tenants(id) on delete cascade,
  surface text not null,       -- 'employee_home' | 'store_performance_dashboard' | 'wallboard' | 'my_store'
  widget_id text not null,     -- src/lib/dashboardWidgets.tsx'teki registry id
  is_visible boolean not null default true,
  x int not null default 0,
  y int not null default 0,
  w int not null default 4,
  h int not null default 2,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, surface, widget_id)
);

alter table tenant_dashboard_layouts enable row level security;

-- Herkes okuyabilir (widget'ların normal kullanıcı görünümünde
-- konumlanabilmesi için gerekli), sadece tenant_admin yazabilir —
-- feature_flags_select/feature_flags_write (0013_admin.sql) ile
-- birebir aynı desen.
create policy dashboard_layouts_select on tenant_dashboard_layouts
  for select using (tenant_id = current_tenant_id());

create policy dashboard_layouts_write on tenant_dashboard_layouts
  for all using (
    tenant_id = current_tenant_id() and current_user_role() = 'tenant_admin'
  )
  with check (tenant_id = current_tenant_id());
