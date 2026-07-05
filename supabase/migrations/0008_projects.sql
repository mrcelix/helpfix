-- ============================================================
-- HelpFix — 0008_projects.sql
-- Proje Yönetimi: projeler (RAG sağlık durumuyla), görevler (basit
-- kanban), risk kaydı.
-- ============================================================

create type project_status as enum ('planning', 'active', 'on_hold', 'completed', 'cancelled');
create type project_health as enum ('green', 'amber', 'red');
create type task_status as enum ('todo', 'in_progress', 'done');
create type risk_level as enum ('low', 'medium', 'high');
create type risk_status as enum ('open', 'mitigated', 'closed');

create table projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  status project_status not null default 'planning',
  health project_health not null default 'green',
  owner_id uuid references user_profiles(id),
  start_date date,
  end_date date,
  budget numeric(14, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_projects_tenant on projects(tenant_id);
create index idx_projects_status on projects(tenant_id, status);

create trigger trg_project_touch
  before update on projects
  for each row execute function touch_updated_at();

create table project_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  status task_status not null default 'todo',
  assignee_id uuid references user_profiles(id),
  due_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_project_tasks_project on project_tasks(project_id);

create table project_risks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  impact risk_level not null default 'medium',
  likelihood risk_level not null default 'medium',
  status risk_status not null default 'open',
  owner_id uuid references user_profiles(id),
  created_at timestamptz not null default now()
);

create index idx_project_risks_project on project_risks(project_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table projects enable row level security;
alter table project_tasks enable row level security;
alter table project_risks enable row level security;

create policy projects_select on projects
  for select using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

create policy projects_write on projects
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  )
  with check (tenant_id = current_tenant_id());

create policy project_tasks_select on project_tasks
  for select using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

create policy project_tasks_write on project_tasks
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  )
  with check (tenant_id = current_tenant_id());

create policy project_risks_select on project_risks
  for select using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

create policy project_risks_write on project_risks
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  )
  with check (tenant_id = current_tenant_id());
