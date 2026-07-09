-- ============================================================
-- HelpFix — 0038_ai_usage_quota.sql
-- Faz AT+1: ai-assist Edge Function'ı için tenant başına aylık
-- kullanım kotası + kullanım günlüğü.
--
--   ai_quota       — tenant başına aylık AI çağrı limiti (varsayılan 500).
--   ai_usage_log   — her başarılı AI çağrısının kaydı (action + kim + ne
--                     zaman). Admin panelinde "Bu ay X/500 kullanıldı"
--                     ve action bazlı dağılım için kullanılır.
--
-- Kota kontrolü ve loglama Edge Function içinde service_role ile yapılır
-- (bkz. ai-assist fonksiyonu) çünkü requester rolü dahi kota kontrolüne
-- tabi olmalı, ancak kullanım günlüğünü SADECE admin/manager görebilir.
-- ============================================================

create table ai_quota (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  monthly_limit int not null default 500,
  updated_at timestamptz not null default now()
);

alter table ai_quota enable row level security;

create policy ai_quota_select on ai_quota
  for select using (tenant_id = current_tenant_id());

create policy ai_quota_write on ai_quota
  for all using (tenant_id = current_tenant_id() and current_user_role() = 'tenant_admin')
  with check (tenant_id = current_tenant_id());

-- Mevcut tüm tenant'lara varsayılan kota (500/ay) seed et.
insert into ai_quota (tenant_id, monthly_limit)
select id, 500 from tenants
on conflict (tenant_id) do nothing;

-- Yeni tenant oluşturulduğunda otomatik seed.
create or replace function seed_default_ai_quota()
returns trigger
language plpgsql
as $$
begin
  insert into ai_quota (tenant_id, monthly_limit) values (new.id, 500)
  on conflict (tenant_id) do nothing;
  return new;
end;
$$;

create trigger trg_seed_ai_quota
  after insert on tenants
  for each row execute function seed_default_ai_quota();

-- ------------------------------------------------------------
-- KULLANIM GÜNLÜĞÜ
-- ------------------------------------------------------------
create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references user_profiles(id) on delete set null,
  action text not null, -- 'suggest-triage' | 'summarize' | 'draft-reply'
  created_at timestamptz not null default now()
);

create index idx_ai_usage_log_tenant_date on ai_usage_log(tenant_id, created_at);

alter table ai_usage_log enable row level security;

-- Görüntüleme: sadece yönetici + ekip yöneticisi (admin panel için).
create policy ai_usage_log_select on ai_usage_log
  for select using (
    tenant_id = current_tenant_id()
    and current_user_role() in ('tenant_admin', 'manager')
  );

-- Ekleme: herhangi bir tenant üyesi kendi tenant'ı için loglayabilir
-- (AI triyaj önerisi requester'lar tarafından da tetiklenebiliyor).
create policy ai_usage_log_insert on ai_usage_log
  for insert with check (tenant_id = current_tenant_id());

-- ------------------------------------------------------------
-- Bu ayki kullanımı action bazında özetleyen RPC — admin panelinde
-- tek sorguda kırılım göstermek için.
-- ------------------------------------------------------------
create or replace function get_ai_usage_current_month(p_tenant_id uuid)
returns table(action text, call_count bigint)
language sql
stable
as $$
  select action, count(*) as call_count
  from ai_usage_log
  where tenant_id = p_tenant_id
    and created_at >= date_trunc('month', now())
  group by action
$$;
