-- ============================================================
-- HelpFix — 0001_init.sql
-- Çekirdek (tenant/kullanıcı) şeması + Row Level Security
-- Tüm modül tabloları aynı "tenant_id = current tenant" deseniyle
-- izole edilir. Bu migration'ı Supabase SQL editöründe veya
-- `supabase db push` ile uygulayın.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- ENUM TYPES ----------
create type user_role as enum ('tenant_admin', 'manager', 'agent', 'requester');
create type tenant_plan as enum ('starter', 'growth', 'enterprise');
create type ticket_priority as enum ('P1', 'P2', 'P3', 'P4');
create type ticket_status as enum ('new', 'open', 'in_progress', 'on_hold', 'resolved', 'closed', 'merged');
create type ticket_channel as enum ('portal', 'email', 'chat', 'phone', 'teams');

-- ---------- TENANTS ----------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan tenant_plan not null default 'starter',
  created_at timestamptz not null default now()
);

-- ---------- DEPARTMENTS ----------
create table departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  manager_id uuid, -- FK to user_profiles, added after that table exists
  created_at timestamptz not null default now()
);

-- ---------- USER PROFILES ----------
-- auth_user_id = supabase auth.users.id. Kept separate from `id` so a
-- profile can outlive an auth identity swap (e.g. SSO migration).
create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null default 'requester',
  department_id uuid references departments(id) on delete set null,
  avatar_initials text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table departments
  add constraint departments_manager_fk foreign key (manager_id) references user_profiles(id) on delete set null;

create index idx_user_profiles_tenant on user_profiles(tenant_id);
create index idx_user_profiles_auth_user on user_profiles(auth_user_id);

-- ---------- HELPER: current tenant / role from JWT ----------
-- Supabase JWT'ye tenant_id ve role custom claim olarak eklenmelidir
-- (bkz. auth hook / Edge Function). Geliştirme sırasında bu fonksiyon
-- user_profiles tablosundan da okuyabilir; production'da JWT claim
-- daha performanslıdır.
--
-- KRİTİK: Bu fonksiyonlar `security definer` OLMALI. Aksi halde,
-- user_profiles tablosundaki RLS politikası bu fonksiyonu çağırır,
-- fonksiyon da içeride user_profiles'ı sorgular — bu sorgu da aynı RLS
-- politikasına tabi olur ve current_tenant_id()'yi tekrar çağırır.
-- Sonsuz döngü oluşur, Postgres hatayla keser, PostgREST 500 döner.
-- security definer, fonksiyon içindeki sorgunun RLS'i atlamasını
-- sağlayarak döngüyü kırar.
create or replace function current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from user_profiles where auth_user_id = auth.uid()
$$;

create or replace function current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from user_profiles where auth_user_id = auth.uid()
$$;

create or replace function current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from user_profiles where auth_user_id = auth.uid()
$$;

-- ---------- INCIDENTS (Servis Masası) ----------
create sequence incident_ref_seq;

create table incidents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ref text not null unique,
  title text not null,
  description text,
  priority ticket_priority not null default 'P3',
  status ticket_status not null default 'new',
  channel ticket_channel not null default 'portal',
  category text,
  requester_id uuid not null references user_profiles(id),
  assignee_id uuid references user_profiles(id),
  possible_duplicate_of uuid references incidents(id),
  sla_policy_id uuid,
  sla_due_at timestamptz,
  csat_score smallint check (csat_score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz
);

create index idx_incidents_tenant on incidents(tenant_id);
create index idx_incidents_status on incidents(tenant_id, status);
create index idx_incidents_assignee on incidents(assignee_id);

-- Auto-generate human-readable ref like INC-000418
create or replace function set_incident_ref()
returns trigger
language plpgsql
as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := 'INC-' || lpad(nextval('incident_ref_seq')::text, 6, '0');
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_incident_ref
  before insert on incidents
  for each row execute function set_incident_ref();

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_incident_touch
  before update on incidents
  for each row execute function touch_updated_at();

-- ---------- INCIDENT COMMENTS ----------
create table incident_comments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  author_id uuid not null references user_profiles(id),
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_incident_comments_incident on incident_comments(incident_id);

-- ---------- INCIDENT TIMELINE (audit trail per ticket) ----------
create table incident_timeline (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  actor_id uuid references user_profiles(id),
  event_type text not null,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_incident_timeline_incident on incident_timeline(incident_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table tenants enable row level security;
alter table departments enable row level security;
alter table user_profiles enable row level security;
alter table incidents enable row level security;
alter table incident_comments enable row level security;
alter table incident_timeline enable row level security;

-- Tenants: a user may only see their own tenant row
create policy tenants_select on tenants
  for select using (id = current_tenant_id());

-- Departments: standard tenant isolation
create policy departments_select on departments
  for select using (tenant_id = current_tenant_id());
create policy departments_write on departments
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin'))
  with check (tenant_id = current_tenant_id());

-- User profiles: everyone in a tenant can see co-workers (for assignment
-- pickers etc.), but only tenant_admin can write to other people's rows.
create policy user_profiles_select on user_profiles
  for select using (tenant_id = current_tenant_id());
create policy user_profiles_update_self on user_profiles
  for update using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());
create policy user_profiles_admin_write on user_profiles
  for all using (tenant_id = current_tenant_id() and current_user_role() = 'tenant_admin')
  with check (tenant_id = current_tenant_id());

-- Incidents: tenant isolation + row-level nuance —
--  - requesters only see their own tickets
--  - agents/managers/admins see everything in the tenant
create policy incidents_select on incidents
  for select using (
    tenant_id = current_tenant_id()
    and (
      current_user_role() in ('tenant_admin', 'manager', 'agent')
      or requester_id = current_profile_id()
    )
  );

create policy incidents_insert on incidents
  for insert with check (
    tenant_id = current_tenant_id()
    and requester_id = current_profile_id()
  );

create policy incidents_update on incidents
  for update using (
    tenant_id = current_tenant_id()
    and (
      current_user_role() in ('tenant_admin', 'manager', 'agent')
      or requester_id = current_profile_id()
    )
  )
  with check (tenant_id = current_tenant_id());

-- Comments: internal notes hidden from requesters
create policy incident_comments_select on incident_comments
  for select using (
    exists (
      select 1 from incidents i
      where i.id = incident_comments.incident_id
        and i.tenant_id = current_tenant_id()
        and (
          current_user_role() in ('tenant_admin', 'manager', 'agent')
          or (i.requester_id = current_profile_id() and incident_comments.is_internal = false)
        )
    )
  );

create policy incident_comments_insert on incident_comments
  for insert with check (
    exists (
      select 1 from incidents i
      where i.id = incident_comments.incident_id
        and i.tenant_id = current_tenant_id()
    )
    and author_id = current_profile_id()
  );

-- Timeline: read-only for the people who can see the ticket; written by
-- the backend/service role via triggers or Edge Functions, not directly
-- by end users.
create policy incident_timeline_select on incident_timeline
  for select using (
    exists (
      select 1 from incidents i
      where i.id = incident_timeline.incident_id
        and i.tenant_id = current_tenant_id()
        and (
          current_user_role() in ('tenant_admin', 'manager', 'agent')
          or i.requester_id = current_profile_id()
        )
    )
  );

-- ============================================================
-- SEED (development only — remove before production)
-- ============================================================
-- insert into tenants (name, slug, plan) values ('Sabancı Teknoloji', 'sabanci-teknoloji', 'growth');
