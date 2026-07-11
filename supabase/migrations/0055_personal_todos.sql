-- ============================================================
-- HelpFix — 0055_personal_todos.sql
-- Faz BR: Dashboard/Admin UI-UX cilası (Gentelella analizi) —
-- Kişisel Yapılacaklar widget'ı için tablo.
--
-- Tamamen kişisel — RLS ile sadece sahibi görür/yazar (AI sohbet
-- geçmişiyle aynı gizlilik deseni, bkz. 0049).
-- ============================================================

create table personal_todos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  text text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_personal_todos_user on personal_todos(user_id, created_at);

alter table personal_todos enable row level security;

create policy personal_todos_select on personal_todos
  for select using (tenant_id = current_tenant_id() and user_id = current_profile_id());

create policy personal_todos_insert on personal_todos
  for insert with check (tenant_id = current_tenant_id() and user_id = current_profile_id());

create policy personal_todos_update on personal_todos
  for update using (tenant_id = current_tenant_id() and user_id = current_profile_id());

create policy personal_todos_delete on personal_todos
  for delete using (tenant_id = current_tenant_id() and user_id = current_profile_id());
