-- ============================================================
-- HelpFix — 0002_problems.sql
-- Problem Yönetimi: problems tablosu + incident bağlantı tablosu.
-- Bilinen Hata Veritabanı (Known Error DB), problems tablosunun
-- is_known_error = true olan alt kümesidir — ayrı bir tablo değil.
-- ============================================================

create type problem_status as enum (
  'investigating',
  'root_cause_identified',
  'known_error',
  'monitoring',
  'resolved',
  'closed'
);

create sequence problem_ref_seq;

create table problems (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ref text not null unique,
  title text not null,
  description text,
  status problem_status not null default 'investigating',
  priority ticket_priority not null default 'P3',
  category text,
  root_cause text,
  is_known_error boolean not null default false,
  known_error_workaround text,
  owner_id uuid references user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_problems_tenant on problems(tenant_id);
create index idx_problems_status on problems(tenant_id, status);
create index idx_problems_known_error on problems(tenant_id, is_known_error) where is_known_error = true;

create or replace function set_problem_ref()
returns trigger
language plpgsql
as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := 'PRB-' || lpad(nextval('problem_ref_seq')::text, 6, '0');
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_problem_ref
  before insert on problems
  for each row execute function set_problem_ref();

create trigger trg_problem_touch
  before update on problems
  for each row execute function touch_updated_at();

-- ---------- PROBLEM ↔ INCIDENT BAĞLANTISI ----------
-- AI Proaktif Tespit özelliğinin temeli: birden çok olay tek bir
-- probleme bağlanabilir (many-to-many, ama pratikte genelde N olay → 1 problem).
create table problem_incidents (
  problem_id uuid not null references problems(id) on delete cascade,
  incident_id uuid not null references incidents(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (problem_id, incident_id)
);

create index idx_problem_incidents_incident on problem_incidents(incident_id);

-- ---------- TIMELINE (problems için de aynı desen) ----------
create table problem_timeline (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references problems(id) on delete cascade,
  actor_id uuid references user_profiles(id),
  event_type text not null,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_problem_timeline_problem on problem_timeline(problem_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table problems enable row level security;
alter table problem_incidents enable row level security;
alter table problem_timeline enable row level security;

-- Problemler sadece tenant içi ajan/yönetici/admin tarafından görülür —
-- requester rolündeki son kullanıcılar problem yönetimini görmez
-- (mockup'taki modül erişim matrisiyle tutarlı: requester = ✗).
create policy problems_select on problems
  for select using (
    tenant_id = current_tenant_id()
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

create policy problems_write on problems
  for all using (
    tenant_id = current_tenant_id()
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
  )
  with check (tenant_id = current_tenant_id());

create policy problem_incidents_select on problem_incidents
  for select using (
    exists (
      select 1 from problems p
      where p.id = problem_incidents.problem_id
        and p.tenant_id = current_tenant_id()
        and current_user_role() in ('tenant_admin', 'manager', 'agent')
    )
  );

create policy problem_incidents_write on problem_incidents
  for all using (
    exists (
      select 1 from problems p
      where p.id = problem_incidents.problem_id
        and p.tenant_id = current_tenant_id()
        and current_user_role() in ('tenant_admin', 'manager', 'agent')
    )
  );

create policy problem_timeline_select on problem_timeline
  for select using (
    exists (
      select 1 from problems p
      where p.id = problem_timeline.problem_id
        and p.tenant_id = current_tenant_id()
        and current_user_role() in ('tenant_admin', 'manager', 'agent')
    )
  );

-- ============================================================
-- AI PROAKTİF TESPİT (basit ama gerçek sürüm)
-- Mockup'taki "AI Proactive Detection" özelliğinin veritabanı temeli:
-- son 7 günde aynı kategoride 3+ açık/çözülmüş-ama-probleme-bağlanmamış
-- olay varsa, bunu bir "problem adayı" olarak işaretler. Gerçek bir ML
-- modeli değil, ama gerçek veriyle çalışan, genişletilebilir bir kural.
-- ============================================================
create or replace function get_incident_cluster_candidates(p_tenant_id uuid)
returns table (
  category text,
  incident_count bigint,
  sample_incident_ids uuid[],
  sample_titles text[],
  earliest_created_at timestamptz
)
language sql
stable
as $$
  select
    i.category,
    count(*) as incident_count,
    array_agg(i.id order by i.created_at desc)[1:5] as sample_incident_ids,
    array_agg(i.title order by i.created_at desc)[1:5] as sample_titles,
    min(i.created_at) as earliest_created_at
  from incidents i
  where i.tenant_id = p_tenant_id
    and i.category is not null
    and i.created_at > now() - interval '7 days'
    and not exists (
      select 1 from problem_incidents pi where pi.incident_id = i.id
    )
  group by i.category
  having count(*) >= 3
  order by count(*) desc
$$;
