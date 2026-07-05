-- ============================================================
-- HelpFix — 0023b_automation_expand_triggers.sql
-- Cila: AI Otomasyon motorunu genişletme (2/2) — 0023'ü çalıştırdıktan
-- SONRA, ayrı bir "Run" ile bu dosyayı çalıştırın.
-- ============================================================

create or replace function apply_automation_rules_problems()
returns trigger
language plpgsql
as $$
declare
  v_rule automation_rules%rowtype;
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
    end if;
    update automation_rules set execution_count = execution_count + 1 where id = v_rule.id;
  end loop;
  return new;
end;
$$;

create trigger trg_apply_automation_problems
  before insert on problems
  for each row execute function apply_automation_rules_problems();

-- Not: changes tablosunda incidents/problems'daki gibi bir "priority"
-- alanı yok (risk_score var) — bu yüzden burada sadece kategori
-- eşleşmesi kontrol edilir.
create or replace function apply_automation_rules_changes()
returns trigger
language plpgsql
as $$
declare
  v_rule automation_rules%rowtype;
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
    end if;
    update automation_rules set execution_count = execution_count + 1 where id = v_rule.id;
  end loop;
  return new;
end;
$$;

create trigger trg_apply_automation_changes
  before insert on changes
  for each row execute function apply_automation_rules_changes();
