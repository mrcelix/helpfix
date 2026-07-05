-- ============================================================
-- HelpFix — 0018_escalation_matrix.sql
-- Cila: SLA Yönetimi'ne Eskalasyon Matrisi. Her politika için birden
-- çok seviye tanımlanabilir (örn. %80'de teknisyene, %100'de
-- yöneticiye, %150'de admin'e bildirim). Gerçek e-posta/push
-- bildirimi altyapımız olmadığı için (dürüstçe not ediyorum), bu
-- seviyeler İzleme ekranında gerçek zamanlı hesaplanıp gösterilir —
-- "Seviye 2 tetiklendi: Yönetici bilgilendirilmeli" gibi.
-- ============================================================

create type escalation_notify_role as enum ('agent', 'manager', 'tenant_admin');

create table sla_escalation_levels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  sla_policy_id uuid not null references sla_policies(id) on delete cascade,
  level int not null,
  trigger_percent int not null, -- çözüm süresinin %'si dolunca tetiklenir (100+ = ihlal sonrası)
  notify_role escalation_notify_role not null,
  created_at timestamptz not null default now(),
  unique (sla_policy_id, level)
);

create index idx_escalation_levels_policy on sla_escalation_levels(sla_policy_id);

alter table sla_escalation_levels enable row level security;

create policy escalation_levels_select on sla_escalation_levels
  for select using (tenant_id = current_tenant_id());

create policy escalation_levels_write on sla_escalation_levels
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager')
  )
  with check (tenant_id = current_tenant_id());
