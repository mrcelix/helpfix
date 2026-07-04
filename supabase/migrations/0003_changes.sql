-- ============================================================
-- HelpFix — 0003_changes.sql
-- Değişiklik Yönetimi: risk skoruna göre otomatik onay zinciri
-- (60+ risk → Teknik İnceleme + CAB; altı → sadece CAB) ve
-- Post-Implementation Review (PIR) alanları.
-- ============================================================

create type change_type as enum ('standard', 'normal', 'emergency');
create type change_status as enum (
  'draft',
  'submitted',
  'technical_review',
  'cab_review',
  'approved',
  'scheduled',
  'in_progress',
  'completed',
  'failed',
  'closed'
);
create type approval_type as enum ('technical_review', 'cab');
create type approval_status as enum ('pending', 'approved', 'rejected');
create type pir_outcome as enum ('successful', 'partial', 'failed', 'rolled_back');

create sequence change_ref_seq;

create table changes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ref text not null unique,
  title text not null,
  description text,
  change_type change_type not null default 'normal',
  status change_status not null default 'draft',
  risk_score smallint not null default 20 check (risk_score between 0 and 100),
  category text,
  requester_id uuid not null references user_profiles(id),
  implementer_id uuid references user_profiles(id),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  rollback_plan text,
  pir_outcome pir_outcome,
  pir_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index idx_changes_tenant on changes(tenant_id);
create index idx_changes_status on changes(tenant_id, status);

create or replace function set_change_ref()
returns trigger
language plpgsql
as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := 'CHG-' || lpad(nextval('change_ref_seq')::text, 6, '0');
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_change_ref
  before insert on changes
  for each row execute function set_change_ref();

create trigger trg_change_touch
  before update on changes
  for each row execute function touch_updated_at();

-- ---------- ONAYLAR ----------
create table change_approvals (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references changes(id) on delete cascade,
  approval_type approval_type not null,
  approver_id uuid references user_profiles(id),
  status approval_status not null default 'pending',
  comment text,
  decided_at timestamptz
);

create index idx_change_approvals_change on change_approvals(change_id);

-- Bir değişiklik "submitted" durumuna geçtiğinde, risk skoruna göre
-- gereken onay satırlarını otomatik oluşturur:
--  - risk >= 60: Teknik İnceleme + CAB (çift katmanlı)
--  - risk < 60: sadece CAB
create or replace function create_change_approvals()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'submitted' and old.status is distinct from 'submitted' then
    delete from change_approvals where change_id = new.id and status = 'pending';

    if new.risk_score >= 60 then
      insert into change_approvals (change_id, approval_type) values (new.id, 'technical_review');
    end if;
    insert into change_approvals (change_id, approval_type) values (new.id, 'cab');

    new.status := case when new.risk_score >= 60 then 'technical_review' else 'cab_review' end;
  end if;
  return new;
end;
$$;

create trigger trg_change_create_approvals
  before update on changes
  for each row execute function create_change_approvals();

-- ---------- TIMELINE ----------
create table change_timeline (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references changes(id) on delete cascade,
  actor_id uuid references user_profiles(id),
  event_type text not null,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_change_timeline_change on change_timeline(change_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table changes enable row level security;
alter table change_approvals enable row level security;
alter table change_timeline enable row level security;

-- Mockup'taki modül erişim matrisiyle tutarlı: requester bu modülü görmez.
create policy changes_select on changes
  for select using (
    tenant_id = current_tenant_id()
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

create policy changes_write on changes
  for all using (
    tenant_id = current_tenant_id()
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
  )
  with check (tenant_id = current_tenant_id());

create policy change_approvals_select on change_approvals
  for select using (
    exists (
      select 1 from changes c
      where c.id = change_approvals.change_id
        and c.tenant_id = current_tenant_id()
        and current_user_role() in ('tenant_admin', 'manager', 'agent')
    )
  );

create policy change_approvals_write on change_approvals
  for all using (
    exists (
      select 1 from changes c
      where c.id = change_approvals.change_id
        and c.tenant_id = current_tenant_id()
        and current_user_role() in ('tenant_admin', 'manager', 'agent')
    )
  );

create policy change_timeline_select on change_timeline
  for select using (
    exists (
      select 1 from changes c
      where c.id = change_timeline.change_id
        and c.tenant_id = current_tenant_id()
        and current_user_role() in ('tenant_admin', 'manager', 'agent')
    )
  );
