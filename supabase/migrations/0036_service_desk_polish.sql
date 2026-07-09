-- ============================================================
-- HelpFix — 0036_service_desk_polish.sql
-- Cila Faz AR: Servis Masası —
--   1) Hazır yanıtlar (canned responses): ajanların tekrar eden
--      yanıtları şablon olarak kaydedip "/" ile eklemesi.
--   2) Kullanıcı tanımlı kaydedilmiş görünümler: filtre + kanal +
--      sıralama kombinasyonunu isimle saklama.
-- (Ajan çarpışma göstergesi Supabase Realtime presence ile
--  çalışır; tablo gerektirmez.)
-- ============================================================

-- ------------------------------------------------------------
-- 1) HAZIR YANITLAR
-- ------------------------------------------------------------
create table canned_responses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_canned_responses_tenant on canned_responses(tenant_id);

alter table canned_responses enable row level security;

-- Tenant içindeki tüm ajan+ roller görebilir ve kullanabilir.
create policy canned_responses_select on canned_responses
  for select using (
    tenant_id = current_tenant_id()
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

create policy canned_responses_insert on canned_responses
  for insert with check (
    tenant_id = current_tenant_id()
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

-- Silme: yazan kişi ya da yönetici.
create policy canned_responses_delete on canned_responses
  for delete using (
    tenant_id = current_tenant_id()
    and (
      created_by = current_profile_id()
      or current_user_role() in ('tenant_admin', 'manager')
    )
  );

-- ------------------------------------------------------------
-- 2) KAYDEDİLMİŞ GÖRÜNÜMLER (kişiye özel)
-- filters örneği: {"view":"open","channel":"email","sortBy":"sla"}
-- ------------------------------------------------------------
create table saved_filters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_saved_filters_user on saved_filters(user_id);

alter table saved_filters enable row level security;

-- Kaydedilmiş görünüm tamamen kişiseldir: sadece sahibi görür/yönetir.
create policy saved_filters_all on saved_filters
  for all using (user_id = current_profile_id() and tenant_id = current_tenant_id())
  with check (user_id = current_profile_id() and tenant_id = current_tenant_id());
