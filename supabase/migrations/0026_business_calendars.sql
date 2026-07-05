-- ============================================================
-- HelpFix — 0026_business_calendars.sql
-- Cila: SLA Yönetimi'ne İş Takvimleri — basitleştirilmiş ama gerçek
-- bir versiyon: politika "sadece iş saatleri" olarak işaretlenirse,
-- SLA hedef tarihi hesaplanırken hafta sonları atlanır (tam saat
-- bazlı takvim değil, ama gerçek ve çalışan bir yaklaşım).
-- ============================================================

alter table sla_policies add column business_hours_only boolean not null default false;

-- apply_sla_policy() fonksiyonunu güncelle: business_hours_only=true
-- ise, resolution_time_minutes'i dakika yerine "iş günü" olarak
-- yorumlar ve hafta sonlarını atlayarak hedef tarihi hesaplar.
create or replace function apply_sla_policy()
returns trigger
language plpgsql
as $$
declare
  v_policy sla_policies%rowtype;
  v_due timestamptz;
  v_remaining_minutes int;
  v_cursor timestamptz;
begin
  if (tg_op = 'INSERT') or (new.priority is distinct from old.priority) then
    select * into v_policy
    from sla_policies
    where tenant_id = new.tenant_id and priority = new.priority and is_active = true
    limit 1;

    if found then
      new.sla_policy_id := v_policy.id;

      if not v_policy.business_hours_only then
        new.sla_due_at := coalesce(new.created_at, now()) + (v_policy.resolution_time_minutes || ' minutes')::interval;
      else
        -- Basitleştirilmiş iş takvimi: hafta sonlarını (Cmt/Paz) atlayarak
        -- dakika dakika ilerlet. Küçük SLA sürelerinde (dakikalar/saatler)
        -- performanslıdır; çok uzun süreler için optimize değildir.
        v_cursor := coalesce(new.created_at, now());
        v_remaining_minutes := v_policy.resolution_time_minutes;
        while v_remaining_minutes > 0 loop
          if extract(dow from v_cursor) in (0, 6) then
            v_cursor := date_trunc('day', v_cursor) + interval '1 day';
          else
            v_cursor := v_cursor + interval '1 minute';
            v_remaining_minutes := v_remaining_minutes - 1;
          end if;
        end loop;
        new.sla_due_at := v_cursor;
      end if;
    end if;
  end if;
  return new;
end;
$$;
