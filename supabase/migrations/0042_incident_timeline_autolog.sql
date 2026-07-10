-- ============================================================
-- HelpFix — 0042_incident_timeline_autolog.sql
-- Faz BC hazırlığı: incident_timeline tablosu tanımlıydı ama hiçbir
-- yerden doldurulmuyordu — Ticket Drawer'daki "Zaman Çizelgesi" hep
-- boştu. Bu migration:
--
--   1) incident_timeline'a INSERT RLS politikası ekler (agent+).
--   2) incidents tablosunda status/priority/assignee/category
--      değiştiğinde OTOMATİK olarak timeline satırı oluşturan bir
--      trigger ekler — tek tek her mutation'a log kodu eklemek
--      yerine merkezi ve garantili çalışır. Faz BC'deki toplu
--      işlemler de dahil, HER incidents UPDATE'i otomatik loglanır.
-- ============================================================

create policy incident_timeline_insert on incident_timeline
  for insert with check (
    exists (
      select 1 from incidents i
      where i.id = incident_timeline.incident_id
        and i.tenant_id = current_tenant_id()
    )
  );

create or replace function log_incident_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := current_profile_id();
begin
  if new.status is distinct from old.status then
    insert into incident_timeline (incident_id, actor_id, event_type, event_data)
    values (new.id, v_actor, 'status_changed', jsonb_build_object('from', old.status, 'to', new.status));
  end if;

  if new.priority is distinct from old.priority then
    insert into incident_timeline (incident_id, actor_id, event_type, event_data)
    values (new.id, v_actor, 'priority_changed', jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    insert into incident_timeline (incident_id, actor_id, event_type, event_data)
    values (new.id, v_actor, 'assignee_changed', jsonb_build_object('from', old.assignee_id, 'to', new.assignee_id));
  end if;

  if new.category is distinct from old.category then
    insert into incident_timeline (incident_id, actor_id, event_type, event_data)
    values (new.id, v_actor, 'category_changed', jsonb_build_object('from', old.category, 'to', new.category));
  end if;

  return new;
end;
$$;

create trigger trg_log_incident_changes
  after update on incidents
  for each row execute function log_incident_changes();
