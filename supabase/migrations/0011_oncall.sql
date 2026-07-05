-- ============================================================
-- HelpFix — 0011_oncall.sql
-- On-Call: nöbet çizelgeleri, vardiyalar, "şu an kim nöbetçi" sorgusu,
-- vardiya değişim talepleri.
-- ============================================================

create type swap_status as enum ('pending', 'approved', 'rejected');

create table oncall_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_oncall_schedules_tenant on oncall_schedules(tenant_id);

create table oncall_shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  schedule_id uuid not null references oncall_schedules(id) on delete cascade,
  user_id uuid not null references user_profiles(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index idx_oncall_shifts_schedule on oncall_shifts(schedule_id);
create index idx_oncall_shifts_time on oncall_shifts(schedule_id, start_time, end_time);
create index idx_oncall_shifts_user on oncall_shifts(user_id);

create table oncall_swap_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  shift_id uuid not null references oncall_shifts(id) on delete cascade,
  requested_by uuid not null references user_profiles(id),
  requested_to uuid not null references user_profiles(id),
  status swap_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index idx_swap_requests_shift on oncall_swap_requests(shift_id);
create index idx_swap_requests_to on oncall_swap_requests(requested_to);

-- Bir değişim onaylandığında vardiyanın sahibini otomatik güncelle.
create or replace function apply_shift_swap()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update oncall_shifts set user_id = new.requested_to where id = new.shift_id;
    new.decided_at := now();
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    new.decided_at := now();
  end if;
  return new;
end;
$$;

create trigger trg_swap_apply
  before update on oncall_swap_requests
  for each row execute function apply_shift_swap();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table oncall_schedules enable row level security;
alter table oncall_shifts enable row level security;
alter table oncall_swap_requests enable row level security;

create policy oncall_schedules_select on oncall_schedules
  for select using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

create policy oncall_schedules_write on oncall_schedules
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager')
  )
  with check (tenant_id = current_tenant_id());

create policy oncall_shifts_select on oncall_shifts
  for select using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

create policy oncall_shifts_write on oncall_shifts
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager')
  )
  with check (tenant_id = current_tenant_id());

-- Değişim talepleri: talebi açan veya hedeflenen kişi görebilir/karar verebilir.
create policy swap_requests_select on oncall_swap_requests
  for select using (
    tenant_id = current_tenant_id()
    and (
      current_user_role() in ('tenant_admin', 'manager')
      or requested_by = current_profile_id()
      or requested_to = current_profile_id()
    )
  );

create policy swap_requests_insert on oncall_swap_requests
  for insert with check (
    tenant_id = current_tenant_id() and requested_by = current_profile_id()
  );

create policy swap_requests_update on oncall_swap_requests
  for update using (
    tenant_id = current_tenant_id()
    and (current_user_role() in ('tenant_admin', 'manager') or requested_to = current_profile_id())
  )
  with check (tenant_id = current_tenant_id());
