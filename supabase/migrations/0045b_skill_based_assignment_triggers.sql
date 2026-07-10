-- ============================================================
-- HelpFix — 0045b_skill_based_assignment_triggers.sql
-- Faz BF: Beceri Bazlı Otomatik Atama (2/2) — 0045'i çalıştırdıktan
-- SONRA, ayrı bir "Run" ile bu dosyayı çalıştırın.
--
-- 'assign_by_skill' eşleştiği kategoride beceri kaydı olan aktif
-- ajan/yönetici/admin'ler arasından EN AZ AÇIK KAYDA SAHİP olanı
-- seçer (iş yükü dengeleme), eşitlik durumunda en yüksek yetkinlik
-- puanına (proficiency) sahip olan kazanır. Kategori eşleşmesi ÖN EK
-- (prefix) bazlıdır — "Ağ & VPN" becerisi "Ağ & VPN – VPN bağlantı
-- sorunu" gibi tüm alt kategorileri de kapsar.
-- ============================================================

create or replace function apply_automation_rules()
returns trigger
language plpgsql
as $$
declare
  v_rule automation_rules%rowtype;
  v_best_agent uuid;
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

    elsif v_rule.action_type = 'assign_by_skill' and new.category is not null then
      select us.user_id into v_best_agent
      from user_skills us
      join user_profiles up on up.id = us.user_id
      where us.tenant_id = new.tenant_id
        and up.is_active = true
        and up.role in ('agent', 'manager', 'tenant_admin')
        and new.category like us.category_label || '%'
      order by
        (select count(*) from incidents i2 where i2.assignee_id = us.user_id and i2.status not in ('resolved', 'closed', 'merged')) asc,
        us.proficiency desc
      limit 1;

      if v_best_agent is not null then
        new.assignee_id := v_best_agent;
      end if;
    end if;

    update automation_rules set execution_count = execution_count + 1 where id = v_rule.id;
  end loop;

  return new;
end;
$$;

create or replace function apply_automation_rules_problems()
returns trigger
language plpgsql
as $$
declare
  v_rule automation_rules%rowtype;
  v_best_agent uuid;
begin
  for v_rule in
    select * from automation_rules
    where tenant_id = new.tenant_id
      and trigger_type = 'problem_created'
      and is_active = true
      and (condition_category is null or condition_category = new.category)
      and (condition_priority is null or condition_priority = new.priority)
  loop
    if v_rule.action_type = 'assign_to_user' and v_rule.action_assignee_id is not null then
      new.owner_id := v_rule.action_assignee_id;

    elsif v_rule.action_type = 'set_priority' and v_rule.action_priority is not null then
      new.priority := v_rule.action_priority;

    elsif v_rule.action_type = 'assign_by_skill' and new.category is not null then
      select us.user_id into v_best_agent
      from user_skills us
      join user_profiles up on up.id = us.user_id
      where us.tenant_id = new.tenant_id
        and up.is_active = true
        and up.role in ('agent', 'manager', 'tenant_admin')
        and new.category like us.category_label || '%'
      order by
        (select count(*) from incidents i2 where i2.assignee_id = us.user_id and i2.status not in ('resolved', 'closed', 'merged')) asc,
        us.proficiency desc
      limit 1;

      if v_best_agent is not null then
        new.owner_id := v_best_agent;
      end if;
    end if;

    update automation_rules set execution_count = execution_count + 1 where id = v_rule.id;
  end loop;

  return new;
end;
$$;

create or replace function apply_automation_rules_changes()
returns trigger
language plpgsql
as $$
declare
  v_rule automation_rules%rowtype;
  v_best_agent uuid;
begin
  for v_rule in
    select * from automation_rules
    where tenant_id = new.tenant_id
      and trigger_type = 'change_created'
      and is_active = true
      and (condition_category is null or condition_category = new.category)
  loop
    if v_rule.action_type = 'assign_to_user' and v_rule.action_assignee_id is not null then
      new.implementer_id := v_rule.action_assignee_id;

    elsif v_rule.action_type = 'assign_by_skill' and new.category is not null then
      select us.user_id into v_best_agent
      from user_skills us
      join user_profiles up on up.id = us.user_id
      where us.tenant_id = new.tenant_id
        and up.is_active = true
        and up.role in ('agent', 'manager', 'tenant_admin')
        and new.category like us.category_label || '%'
      order by
        (select count(*) from incidents i2 where i2.assignee_id = us.user_id and i2.status not in ('resolved', 'closed', 'merged')) asc,
        us.proficiency desc
      limit 1;

      if v_best_agent is not null then
        new.implementer_id := v_best_agent;
      end if;
    end if;

    update automation_rules set execution_count = execution_count + 1 where id = v_rule.id;
  end loop;

  return new;
end;
$$;
