-- ============================================================
-- HelpFix — 0007_sla.sql
-- SLA Yönetimi: öncelik bazlı politikalar + bir olay oluşturulduğunda
-- (veya önceliği değiştiğinde) otomatik sla_due_at hesaplayan trigger.
-- incidents.sla_policy_id / sla_due_at sütunları 0001_init.sql'de
-- zaten tanımlıydı, bu migration onları gerçekten kullanır hale getirir.
-- ============================================================

create table sla_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  priority ticket_priority not null,
  response_time_minutes int not null,
  resolution_time_minutes int not null,
  escalation_warning_percent int not null default 80, -- süresinin %'si dolunca uyar
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index idx_sla_tenant_priority on sla_policies(tenant_id, priority) where is_active = true;
create index idx_sla_tenant on sla_policies(tenant_id);

-- Bir olay oluşturulduğunda veya önceliği değiştiğinde, o önceliğe ait
-- aktif SLA politikasını bulup sla_policy_id + sla_due_at'i otomatik
-- doldurur. İş saatleri hesaba katılmıyor (basitleştirilmiş MVP —
-- gerçek iş takvimi entegrasyonu ileride eklenebilir).
create or replace function apply_sla_policy()
returns trigger
language plpgsql
as $$
declare
  v_policy sla_policies%rowtype;
begin
  if (tg_op = 'INSERT') or (new.priority is distinct from old.priority) then
    select * into v_policy
    from sla_policies
    where tenant_id = new.tenant_id and priority = new.priority and is_active = true
    limit 1;

    if found then
      new.sla_policy_id := v_policy.id;
      new.sla_due_at := coalesce(new.created_at, now()) + (v_policy.resolution_time_minutes || ' minutes')::interval;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_incident_sla
  before insert or update on incidents
  for each row execute function apply_sla_policy();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table sla_policies enable row level security;

create policy sla_policies_select on sla_policies
  for select using (tenant_id = current_tenant_id());

create policy sla_policies_write on sla_policies
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager')
  )
  with check (tenant_id = current_tenant_id());
