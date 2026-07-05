-- ============================================================
-- HelpFix — 0014_fishbone.sql
-- Cila: Problem Yönetimi'ne Fishbone (Ishikawa) kök neden analizi.
-- Klasik 4 kategori: İnsan, Süreç, Teknoloji, Çevre. `root_cause`
-- alanı (0002'den) nihai/onaylanmış kök nedeni tutar; bu tablo ise
-- oraya varmadan önceki beyin fırtınası adaylarını tutar.
-- ============================================================

create type fishbone_category as enum ('people', 'process', 'technology', 'environment');

create table problem_fishbone_causes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  problem_id uuid not null references problems(id) on delete cascade,
  category fishbone_category not null,
  description text not null,
  is_confirmed_root_cause boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_fishbone_problem on problem_fishbone_causes(problem_id);

alter table problem_fishbone_causes enable row level security;

create policy fishbone_select on problem_fishbone_causes
  for select using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

create policy fishbone_write on problem_fishbone_causes
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  )
  with check (tenant_id = current_tenant_id());
