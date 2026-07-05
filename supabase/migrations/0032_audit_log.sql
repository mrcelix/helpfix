-- ============================================================
-- HelpFix — 0032_audit_log.sql
-- Cila: Tenant Admin'e Denetim Günlüğü — güvenlik açısından hassas
-- işlemleri (rol değişiklikleri, modül aç/kapa) otomatik loglar.
-- ============================================================

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_id uuid references user_profiles(id),
  action text not null,
  target_type text not null,
  target_label text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_log_tenant on audit_log(tenant_id, created_at desc);

alter table audit_log enable row level security;

create policy audit_log_select on audit_log
  for select using (
    tenant_id = current_tenant_id() and current_user_role() = 'tenant_admin'
  );

-- ============================================================
-- TETİKLEYİCİLER
-- ============================================================

create or replace function log_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into audit_log (tenant_id, actor_id, action, target_type, target_label, details)
    values (
      new.tenant_id, current_profile_id(), 'role_changed', 'user_profile', new.full_name,
      jsonb_build_object('from', old.role, 'to', new.role)
    );
  end if;
  if new.is_active is distinct from old.is_active then
    insert into audit_log (tenant_id, actor_id, action, target_type, target_label, details)
    values (
      new.tenant_id, current_profile_id(), 'user_active_toggled', 'user_profile', new.full_name,
      jsonb_build_object('is_active', new.is_active)
    );
  end if;
  return new;
end;
$$;

create trigger trg_log_role_change
  after update on user_profiles
  for each row execute function log_role_change();

create or replace function log_feature_flag_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log (tenant_id, actor_id, action, target_type, target_label, details)
  values (
    new.tenant_id, current_profile_id(), 'module_toggled', 'feature_flag', new.module_code,
    jsonb_build_object('is_enabled', new.is_enabled)
  );
  return new;
end;
$$;

create trigger trg_log_feature_flag
  after insert or update on tenant_feature_flags
  for each row execute function log_feature_flag_change();
