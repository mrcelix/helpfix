-- ============================================================
-- HelpFix — 0048_multi_site.sql
-- Faz BJ: Çoklu Site/Lokasyon.
--
-- Kapsam: fiziksel şube/lokasyon kaydı; kullanıcı ve CI'ların bir
-- siteye bağlanması; SLA politikalarının VE iş takviminin (mesai
-- saatleri) siteye özel olabilmesi (site_id NULL = tüm siteler için
-- geçerli tenant varsayılanı — geriye dönük tam uyumlu).
--
-- KASITLI KAPSAM DIŞI: Tatil günleri (tenant_holidays) site bazlı
-- ayrılmadı — resmi/dini tatiller genelde ülke genelinde aynıdır: tüm
-- siteleriniz aynı ülkedeyse (Türkiye) bu yeterlidir. Farklı ülkelerde
-- siteniz varsa gelecekte ayrı bir faz olarak eklenebilir.
-- ============================================================

create table sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  address text,
  city text,
  is_headquarters boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_sites_tenant on sites(tenant_id);

alter table sites enable row level security;

create policy sites_select on sites
  for select using (tenant_id = current_tenant_id());
create policy sites_write on sites
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

-- ------------------------------------------------------------
-- Kullanıcı, CI ve olay kayıtlarına site bağlantısı
-- ------------------------------------------------------------
alter table user_profiles add column site_id uuid references sites(id) on delete set null;
alter table configuration_items add column site_id uuid references sites(id) on delete set null;
alter table incidents add column site_id uuid references sites(id) on delete set null;

-- Olay oluşturulurken talep edenin sitesini otomatik kopyalar. Trigger
-- adı bilinçli seçildi: alfabetik sırada 'trg_incident_site' <
-- 'trg_incident_sla' olduğu için SLA eşleştirmesinden ÖNCE çalışır
-- (Postgres aynı zamanlamadaki trigger'ları isme göre sıralı çalıştırır).
create or replace function set_incident_site()
returns trigger
language plpgsql
as $$
begin
  if new.site_id is null and new.requester_id is not null then
    select site_id into new.site_id from user_profiles where id = new.requester_id;
  end if;
  return new;
end;
$$;

create trigger trg_incident_site
  before insert on incidents
  for each row execute function set_incident_site();

-- ------------------------------------------------------------
-- SLA POLİTİKALARI — site boyutu eklendi
-- ------------------------------------------------------------
alter table sla_policies add column site_id uuid references sites(id) on delete set null;

drop index if exists idx_sla_tenant_priority_category;
create unique index idx_sla_tenant_priority_category_site
  on sla_policies(tenant_id, priority, coalesce(category, ''), coalesce(site_id, '00000000-0000-0000-0000-000000000000'))
  where is_active = true;

-- ------------------------------------------------------------
-- İŞ TAKVİMİ — site boyutu eklendi
-- ------------------------------------------------------------
alter table business_hours add column site_id uuid references sites(id) on delete set null;

drop index if exists idx_business_hours_tenant_day;
create unique index idx_business_hours_tenant_site_day
  on business_hours(tenant_id, coalesce(site_id, '00000000-0000-0000-0000-000000000000'), day_of_week);

-- ------------------------------------------------------------
-- apply_sla_policy() — SİTE FARKINDA GÜNCEL SÜRÜM
--   Politika eşleştirme sırası (en spesifikten en genele):
--     1) öncelik + kategori + site (tam eşleşme)
--     2) öncelik + kategori (site'siz genel)         — new.site_id doluysa denenir
--     3) öncelik + site (kategorisiz)                 — new.category doluysa denenir
--     4) sadece öncelik (tamamen genel)
--   İş takvimi: önce new.site_id'ye özel satır aranır, yoksa
--   tenant varsayılanına (site_id IS NULL) düşülür.
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
  if (tg_op = 'INSERT') or (new.priority is distinct from old.priority) or (new.category is distinct from old.category) or (new.site_id is distinct from old.site_id) then

    select * into v_policy
    from sla_policies
    where tenant_id = new.tenant_id and priority = new.priority and is_active = true
      and category is not distinct from new.category
      and site_id is not distinct from new.site_id
    limit 1;

    if not found and new.site_id is not null then
      select * into v_policy
      from sla_policies
      where tenant_id = new.tenant_id and priority = new.priority and is_active = true
        and category is not distinct from new.category
        and site_id is null
      limit 1;
    end if;

    if not found and new.category is not null then
      select * into v_policy
      from sla_policies
      where tenant_id = new.tenant_id and priority = new.priority and is_active = true
        and category is null
        and site_id is not distinct from new.site_id
      limit 1;
    end if;

    if not found then
      select * into v_policy
      from sla_policies
      where tenant_id = new.tenant_id and priority = new.priority and is_active = true
        and category is null and site_id is null
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

          v_day_start := null;
          v_day_end := null;

          if new.site_id is not null then
            select bh.start_time, bh.end_time into v_day_start, v_day_end
            from business_hours bh
            where bh.tenant_id = new.tenant_id and bh.day_of_week = v_dow and bh.site_id = new.site_id
            limit 1;
          end if;

          if v_day_start is null then
            select bh.start_time, bh.end_time into v_day_start, v_day_end
            from business_hours bh
            where bh.tenant_id = new.tenant_id and bh.day_of_week = v_dow and bh.site_id is null
            limit 1;
          end if;

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
