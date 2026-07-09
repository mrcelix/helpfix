-- ============================================================
-- HelpFix — 0037_business_hours_holidays.sql
-- Faz AS: SLA Yönetimi'nde iki temel yükseltme —
--
--   1) GERÇEK İŞ TAKVİMİ: 0026'daki "hafta sonunu atla" yaklaşımı
--      yerine, tenant başına haftanın günlerine göre mesai saati
--      penceresi (business_hours) + resmi/dini tatil listesi
--      (tenant_holidays). SLA sayacı artık mesai dışında ve tatil
--      günlerinde durur, bir sonraki mesai penceresinde devam eder.
--
--   2) ÖNCELİK × KATEGORİ MATRİSİ: sla_policies'e nullable `category`
--      sütunu. category = NULL → o önceliğin genel/varsayılan
--      politikası. category dolu → sadece o kategoriye özel, daha
--      spesifik politika (örn. P1 + "Ağ" için 30dk, P1 genel için 4s).
-- ============================================================

-- ------------------------------------------------------------
-- 1) ÖNCELİK × KATEGORİ MATRİSİ
-- ------------------------------------------------------------
alter table sla_policies add column category text;

-- Eski tekil (tenant, priority) kısıtını kaldır — artık (tenant,
-- priority, category) üçlüsü benzersiz olmalı. category NULL'ları da
-- ayırt etmek için coalesce ile boş string'e indirgiyoruz.
drop index if exists idx_sla_tenant_priority;
create unique index idx_sla_tenant_priority_category
  on sla_policies(tenant_id, priority, coalesce(category, ''))
  where is_active = true;

-- ------------------------------------------------------------
-- 2) İŞ TAKVİMİ — mesai saatleri
-- day_of_week: Postgres extract(dow) ile aynı, 0=Pazar … 6=Cumartesi.
-- Bir gün için satır yoksa o gün tamamen kapalı sayılır (hafta sonu vb).
-- ------------------------------------------------------------
create table business_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

create unique index idx_business_hours_tenant_day on business_hours(tenant_id, day_of_week);

alter table business_hours enable row level security;

create policy business_hours_select on business_hours
  for select using (tenant_id = current_tenant_id());

create policy business_hours_write on business_hours
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

-- ------------------------------------------------------------
-- 3) TATİL GÜNLERİ (resmi + dini — Diyanet takviminden elle girilir,
-- dini bayramlar yıldan yıla kaydığı için otomatik hesaplanamaz)
-- ------------------------------------------------------------
create table tenant_holidays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  holiday_date date not null,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index idx_tenant_holidays_date on tenant_holidays(tenant_id, holiday_date);

alter table tenant_holidays enable row level security;

create policy tenant_holidays_select on tenant_holidays
  for select using (tenant_id = current_tenant_id());

create policy tenant_holidays_write on tenant_holidays
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

-- ------------------------------------------------------------
-- 4) Mevcut tüm tenant'lara varsayılan mesai takvimi seed et:
-- Pazartesi–Cuma 09:00–18:00 (Türkiye standart ofis mesaisi).
-- ------------------------------------------------------------
insert into business_hours (tenant_id, day_of_week, start_time, end_time)
select t.id, d.dow, time '09:00', time '18:00'
from tenants t
cross join (select unnest(array[1,2,3,4,5]) as dow) d
on conflict (tenant_id, day_of_week) do nothing;

-- Yeni bir tenant oluşturulduğunda da aynı varsayılan takvimi otomatik seed et.
create or replace function seed_default_business_hours()
returns trigger
language plpgsql
as $$
begin
  insert into business_hours (tenant_id, day_of_week, start_time, end_time)
  select new.id, dow, time '09:00', time '18:00'
  from unnest(array[1,2,3,4,5]) as dow
  on conflict (tenant_id, day_of_week) do nothing;
  return new;
end;
$$;

create trigger trg_seed_business_hours
  after insert on tenants
  for each row execute function seed_default_business_hours();

-- ------------------------------------------------------------
-- 5) apply_sla_policy() — GÜNCELLENMİŞ SÜRÜM
--    a) En spesifik politikayı bulur: önce (priority + tam category
--       eşleşmesi), yoksa (priority + category IS NULL, yani genel).
--    b) business_hours_only=false → eskisi gibi anlık dakika ekleme.
--    c) business_hours_only=true  → business_hours + tenant_holidays'e
--       göre gerçek zamanlı ilerletme: tatil/mesai dışı saatlerde
--       sayaç durur, bir sonraki açık pencerede devam eder.
--    d) Güvenlik: tenant için hiç business_hours tanımlı değilse
--       (seed atlanmış / silinmiş), sonsuz döngüye düşmemek için
--       anlık hesaplamaya geri düşer.
-- ------------------------------------------------------------
create or replace function apply_sla_policy()
returns trigger
language plpgsql
as $$
declare
  v_policy sla_policies%rowtype;
  v_has_calendar boolean;
  v_cursor timestamptz;
  v_remaining int;
  v_day_start time;
  v_day_end time;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_available int;
  v_is_holiday boolean;
  v_dow int;
  v_local_date date;
  v_guard int := 0;
begin
  if (tg_op = 'INSERT') or (new.priority is distinct from old.priority) or (new.category is distinct from old.category) then

    -- Tam eşleşme: aynı öncelik + aynı kategori
    select * into v_policy
    from sla_policies
    where tenant_id = new.tenant_id
      and priority = new.priority
      and is_active = true
      and category is not distinct from new.category
    limit 1;

    -- Bulunamadıysa, o önceliğin genel (category IS NULL) politikasına düş
    if not found then
      select * into v_policy
      from sla_policies
      where tenant_id = new.tenant_id
        and priority = new.priority
        and is_active = true
        and category is null
      limit 1;
    end if;

    if found then
      new.sla_policy_id := v_policy.id;

      select exists(select 1 from business_hours where tenant_id = new.tenant_id) into v_has_calendar;

      if not v_policy.business_hours_only or not v_has_calendar then
        new.sla_due_at := coalesce(new.created_at, now()) + (v_policy.resolution_time_minutes || ' minutes')::interval;
      else
        v_cursor := coalesce(new.created_at, now());
        v_remaining := v_policy.resolution_time_minutes;

        while v_remaining > 0 loop
          v_guard := v_guard + 1;
          if v_guard > 3650 then
            -- 10 yıldan uzun süredir açık pencere bulunamadı (takvim
            -- yanlış yapılandırılmış olabilir) — sonsuz döngüyü kes,
            -- anlık hesaplamaya geri düş.
            v_cursor := coalesce(new.created_at, now()) + (v_policy.resolution_time_minutes || ' minutes')::interval;
            v_remaining := 0;
            exit;
          end if;

          v_local_date := v_cursor::date;
          v_dow := extract(dow from v_cursor)::int;

          select exists(
            select 1 from tenant_holidays h
            where h.tenant_id = new.tenant_id and h.holiday_date = v_local_date
          ) into v_is_holiday;

          select bh.start_time, bh.end_time into v_day_start, v_day_end
          from business_hours bh
          where bh.tenant_id = new.tenant_id and bh.day_of_week = v_dow
          limit 1;

          if v_is_holiday or v_day_start is null then
            v_cursor := (v_local_date + 1)::timestamptz;
            continue;
          end if;

          v_window_start := (v_local_date::text || ' ' || v_day_start::text)::timestamptz;
          v_window_end := (v_local_date::text || ' ' || v_day_end::text)::timestamptz;

          if v_cursor < v_window_start then
            v_cursor := v_window_start;
          end if;

          if v_cursor >= v_window_end then
            v_cursor := (v_local_date + 1)::timestamptz;
            continue;
          end if;

          v_available := extract(epoch from (v_window_end - v_cursor))::int / 60;

          if v_available >= v_remaining then
            v_cursor := v_cursor + (v_remaining || ' minutes')::interval;
            v_remaining := 0;
          else
            v_remaining := v_remaining - v_available;
            v_cursor := (v_local_date + 1)::timestamptz;
          end if;
        end loop;

        new.sla_due_at := v_cursor;
      end if;
    end if;
  end if;
  return new;
end;
$$;
