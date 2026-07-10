-- ============================================================
-- HelpFix — 0053_business_services.sql
-- Faz BO: ITIL Uyum İyileştirmeleri — ServiceNow'un "service-aware
-- ITSM" modeline paralel iki değişiklik.
--
--   A) STANDART DEĞİŞİKLİK HIZLI YOLU: ITIL'de Standart Değişiklik
--      ("önceden onaylı, düşük riskli, sık tekrarlanan") CAB onayı
--      GEREKTİRMEZ. Mevcut trigger bunu ayırt etmiyordu. Düzeltildi:
--      change_type='standard' ise submit anında doğrudan 'approved'
--      olur, hiç onay satırı oluşturulmaz.
--
--   B) İŞ HİZMETLERİ (Business Services): ServiceNow'un CSDM
--      modelindeki temel kavram — olaylar/problemler/değişiklikler
--      tek tek cihaza değil, kullanıcının tükettiği İŞ HİZMETİNE
--      (örn. "E-posta Hizmeti", "POS Sistemi") bağlanır.
-- ============================================================

create or replace function create_change_approvals()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'submitted' and old.status is distinct from 'submitted' then
    delete from change_approvals where change_id = new.id and status = 'pending';

    if new.change_type = 'standard' then
      new.status := 'approved';
    else
      if new.risk_score >= 60 then
        insert into change_approvals (change_id, approval_type) values (new.id, 'technical_review');
      end if;
      insert into change_approvals (change_id, approval_type) values (new.id, 'cab');
      new.status := case when new.risk_score >= 60 then 'technical_review' else 'cab_review' end;
    end if;
  end if;
  return new;
end;
$$;

create type service_criticality as enum ('critical', 'high', 'medium', 'low');

create table business_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  criticality service_criticality not null default 'medium',
  owner_id uuid references user_profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_business_services_tenant on business_services(tenant_id);

alter table business_services enable row level security;

create policy business_services_select on business_services
  for select using (tenant_id = current_tenant_id());

create policy business_services_write on business_services
  for all using (tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager'))
  with check (tenant_id = current_tenant_id());

create table business_service_cis (
  business_service_id uuid not null references business_services(id) on delete cascade,
  ci_id uuid not null references configuration_items(id) on delete cascade,
  primary key (business_service_id, ci_id)
);

alter table business_service_cis enable row level security;

create policy business_service_cis_select on business_service_cis
  for select using (
    exists (select 1 from business_services bs where bs.id = business_service_cis.business_service_id and bs.tenant_id = current_tenant_id())
  );

create policy business_service_cis_write on business_service_cis
  for all using (
    exists (
      select 1 from business_services bs
      where bs.id = business_service_cis.business_service_id
        and bs.tenant_id = current_tenant_id()
        and current_user_role() in ('tenant_admin', 'manager')
    )
  );

alter table incidents add column business_service_id uuid references business_services(id) on delete set null;
alter table problems add column business_service_id uuid references business_services(id) on delete set null;
alter table changes add column business_service_id uuid references business_services(id) on delete set null;

create index idx_incidents_business_service on incidents(business_service_id);
create index idx_problems_business_service on problems(business_service_id);
create index idx_changes_business_service on changes(business_service_id);

create or replace function get_business_service_health(p_tenant_id uuid)
returns table (
  service_id uuid,
  service_name text,
  criticality service_criticality,
  owner_name text,
  open_incidents int,
  critical_open_incidents int,
  has_active_major_incident boolean,
  linked_ci_count int,
  online_ci_pct numeric,
  health_status text
)
language sql
stable
as $$
  select
    bs.id,
    bs.name,
    bs.criticality,
    up.full_name,
    coalesce(inc.open_count, 0)::int,
    coalesce(inc.critical_count, 0)::int,
    coalesce(inc.has_major, false),
    coalesce(ci.total, 0)::int,
    case when coalesce(ci.total, 0) = 0 then 100 else round(ci.online::numeric / ci.total * 100, 1) end,
    case
      when coalesce(inc.has_major, false) or coalesce(inc.critical_count, 0) > 0 then 'outage'
      when coalesce(inc.open_count, 0) > 0 then 'degraded'
      else 'operational'
    end
  from business_services bs
  left join user_profiles up on up.id = bs.owner_id
  left join lateral (
    select
      count(*) filter (where i.status not in ('resolved', 'closed', 'merged')) as open_count,
      count(*) filter (where i.status not in ('resolved', 'closed', 'merged') and i.priority = 'P1') as critical_count,
      bool_or(i.is_major_incident and i.status not in ('resolved', 'closed', 'merged')) as has_major
    from incidents i
    where i.business_service_id = bs.id
  ) inc on true
  left join lateral (
    select count(*) as total, count(*) filter (where c.is_online) as online
    from business_service_cis bsc
    join configuration_items c on c.id = bsc.ci_id
    where bsc.business_service_id = bs.id and c.status != 'retired'
  ) ci on true
  where bs.tenant_id = p_tenant_id and bs.is_active = true
  order by bs.criticality, bs.name;
$$;
