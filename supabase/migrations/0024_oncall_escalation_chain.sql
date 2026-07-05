-- ============================================================
-- HelpFix — 0024_oncall_escalation_chain.sql
-- Cila: On-Call'a Eskalasyon Zinciri — bir çizelge için sıralı
-- bildirim adımları (örn. Push → 5dk sonra Arama → 15dk sonra Ekip
-- Lideri). SLA Eskalasyon Matrisi'ndeki gibi: gerçek bildirim
-- göndermez (altyapımız yok), yapılandırma + görselleştirme sağlar.
-- ============================================================

create type oncall_notify_method as enum ('push', 'call', 'team_lead');

create table oncall_escalation_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  schedule_id uuid not null references oncall_schedules(id) on delete cascade,
  step_order int not null,
  delay_minutes int not null,
  notify_method oncall_notify_method not null,
  created_at timestamptz not null default now(),
  unique (schedule_id, step_order)
);

create index idx_escalation_steps_schedule on oncall_escalation_steps(schedule_id);

alter table oncall_escalation_steps enable row level security;

create policy escalation_steps_select on oncall_escalation_steps
  for select using (tenant_id = current_tenant_id());

create policy escalation_steps_write on oncall_escalation_steps
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager')
  )
  with check (tenant_id = current_tenant_id());
