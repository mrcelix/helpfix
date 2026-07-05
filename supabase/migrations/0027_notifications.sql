-- ============================================================
-- HelpFix — 0027_notifications.sql
-- Cila: Gerçek Bildirim Merkezi. Zil ikonu şu ana kadar süsten
-- ibaretti — bu migration onu gerçek olaylarla besliyor:
--  - Bir olay size atandığında
--  - Bir servis talebi onayınızı beklediğinde (manager/admin)
--  - Bir değişiklik onayı size (manager/admin) düştüğünde
--  - Bir vardiya değişim talebi size geldiğinde
--  - Bir talebinize/atandığınız talebe yorum geldiğinde
-- ============================================================

create type notification_type as enum (
  'ticket_assigned', 'approval_needed', 'swap_request', 'new_comment'
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, is_read, created_at desc);

alter table notifications enable row level security;

create policy notifications_select on notifications
  for select using (user_id = current_profile_id());

create policy notifications_update on notifications
  for update using (user_id = current_profile_id())
  with check (user_id = current_profile_id());

-- ============================================================
-- TETİKLEYİCİLER
-- ============================================================

-- 1) Bir olay birine atandığında
create or replace function notify_ticket_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignee_id is not null and new.assignee_id is distinct from old.assignee_id then
    insert into notifications (tenant_id, user_id, type, title, body, link)
    values (
      new.tenant_id, new.assignee_id, 'ticket_assigned',
      'Yeni bir talep size atandı', new.title, '/service-desk?open=' || new.id
    );
  end if;
  return new;
end;
$$;

create trigger trg_notify_ticket_assigned
  after update on incidents
  for each row execute function notify_ticket_assigned();

-- 2) Bir servis talebi onay beklediğinde → tüm manager/admin'lere
create or replace function notify_approval_needed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending_approval' then
    insert into notifications (tenant_id, user_id, type, title, body, link)
    select new.tenant_id, up.id, 'approval_needed', 'Onayınızı bekleyen bir talep var', new.ref, '/catalog'
    from user_profiles up
    where up.tenant_id = new.tenant_id and up.role in ('tenant_admin', 'manager');
  end if;
  return new;
end;
$$;

create trigger trg_notify_approval_needed
  after insert on service_requests
  for each row execute function notify_approval_needed();

-- 3) Bir değişiklik onayı oluştuğunda → tüm manager/admin'lere
create or replace function notify_change_approval_needed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from changes where id = new.change_id;
  insert into notifications (tenant_id, user_id, type, title, body, link)
  select v_tenant_id, up.id, 'approval_needed', 'Onayınızı bekleyen bir değişiklik var', new.approval_type::text, '/changes'
  from user_profiles up
  where up.tenant_id = v_tenant_id and up.role in ('tenant_admin', 'manager');
  return new;
end;
$$;

create trigger trg_notify_change_approval
  after insert on change_approvals
  for each row execute function notify_change_approval_needed();

-- 4) Bir vardiya değişim talebi geldiğinde
create or replace function notify_swap_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (tenant_id, user_id, type, title, body, link)
  values (new.tenant_id, new.requested_to, 'swap_request', 'Bir vardiya değişim talebiniz var', null, '/on-call');
  return new;
end;
$$;

create trigger trg_notify_swap_request
  after insert on oncall_swap_requests
  for each row execute function notify_swap_request();

-- 5) Bir talebe yorum geldiğinde → requester ve assignee'ye (yazan hariç)
create or replace function notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incident incidents%rowtype;
begin
  select * into v_incident from incidents where id = new.incident_id;

  if v_incident.requester_id is distinct from new.author_id and (new.is_internal = false) then
    insert into notifications (tenant_id, user_id, type, title, body, link)
    values (v_incident.tenant_id, v_incident.requester_id, 'new_comment', 'Talebinize yeni bir yanıt geldi', v_incident.title, '/service-desk?open=' || v_incident.id);
  end if;

  if v_incident.assignee_id is not null and v_incident.assignee_id is distinct from new.author_id then
    insert into notifications (tenant_id, user_id, type, title, body, link)
    values (v_incident.tenant_id, v_incident.assignee_id, 'new_comment', 'Atandığınız talebe yeni bir yorum geldi', v_incident.title, '/service-desk?open=' || v_incident.id);
  end if;

  return new;
end;
$$;

create trigger trg_notify_new_comment
  after insert on incident_comments
  for each row execute function notify_new_comment();
