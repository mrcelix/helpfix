-- ============================================================
-- HelpFix — 0012_automation.sql
-- AI Otomasyon (BETA): gerçek konuşma yapan bir sanal asistan LLM API
-- bağlantısı gerektirir (ayrı bir kapsam kararı — bu migration'da yok).
-- Onun yerine gerçekten çalışan, kural tabanlı bir otomasyon motoru:
-- "kategori = X ve öncelik = Y ise otomatik Z ata" mantığı.
-- ============================================================

create type automation_trigger as enum ('incident_created');
create type automation_action as enum ('assign_to_user', 'set_priority');

create table automation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  trigger_type automation_trigger not null default 'incident_created',
  condition_category text, -- null = tüm kategoriler eşleşir
  condition_priority ticket_priority, -- null = tüm öncelikler eşleşir
  action_type automation_action not null,
  action_assignee_id uuid references user_profiles(id), -- assign_to_user için
  action_priority ticket_priority, -- set_priority için
  is_active boolean not null default true,
  execution_count int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_automation_rules_tenant on automation_rules(tenant_id);

-- Bir olay oluşturulduğunda eşleşen aktif kuralları bulup uygular.
-- Birden fazla kural eşleşirse hepsi sırayla uygulanır (basit MVP —
-- öncelik/çatışma yönetimi yok).
create or replace function apply_automation_rules()
returns trigger
language plpgsql
as $$
declare
  v_rule automation_rules%rowtype;
begin
  for v_rule in
    select * from automation_rules
    where tenant_id = new.tenant_id
      and trigger_type = 'incident_created'
      and is_active = true
      and (condition_category is null or condition_category = new.category)
      and (condition_priority is null or condition_priority = new.priority)
  loop
    if v_rule.action_type = 'assign_to_user' and v_rule.action_assignee_id is not null then
      new.assignee_id := v_rule.action_assignee_id;
    elsif v_rule.action_type = 'set_priority' and v_rule.action_priority is not null then
      new.priority := v_rule.action_priority;
    end if;

    update automation_rules set execution_count = execution_count + 1 where id = v_rule.id;
  end loop;

  return new;
end;
$$;

create trigger trg_apply_automation
  before insert on incidents
  for each row execute function apply_automation_rules();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table automation_rules enable row level security;

create policy automation_rules_select on automation_rules
  for select using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager')
  );

create policy automation_rules_write on automation_rules
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager')
  )
  with check (tenant_id = current_tenant_id());
