-- ============================================================
-- HelpFix — 0043_request_approval_chain.sql
-- Faz BD: Servis Kataloğu taleplerine ÇOK KADEMELİ onay zinciri.
--
-- Değişiklik Yönetimi'nde zaten risk skoruna göre iki katmanlı bir
-- onay akışı vardı (0003_changes.sql); bu migration aynı deseni
-- Servis Kataloğu taleplerine, yapılandırılabilir aşama sayısıyla
-- genişletiyor.
--
-- Bir katalog öğesine `approval_chain` (jsonb, sıralı dizi) tanımlanır:
--   '[{"type":"department_manager"},{"type":"tenant_admin"}]'
--   '[{"type":"specific_user","approver_id":"<uuid>"}]'
-- Boş bırakılırsa (varsayılan) ve requires_approval=true ise, geriye
-- dönük uyumluluk için tek aşamalı 'tenant_admin' onayına düşer.
--
-- Aşamalar SIRAYLA açılır: 2. aşama satırı, 1. aşama onaylanmadan
-- oluşturulmaz (change_approvals'ın aksine — orada tüm aşamalar
-- baştan oluşturulup durum client tarafında ilerletiliyordu; burada
-- sıralı açılım daha doğru çünkü aşamalar arasında KİM'in onaylayacağı
-- önceki aşamaya bağlı olabilir).
-- ============================================================

alter table service_catalog_items add column approval_chain jsonb not null default '[]'::jsonb;

create table request_approvals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests(id) on delete cascade,
  stage int not null,
  approver_type text not null check (approver_type in ('department_manager', 'tenant_admin', 'specific_user')),
  approver_id uuid references user_profiles(id), -- specific_user: hedef kişi; karar sonrası kararı verenle güncellenir
  status approval_status not null default 'pending',
  comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_request_approvals_request on request_approvals(request_id);
create unique index idx_request_approvals_request_stage on request_approvals(request_id, stage);

-- ------------------------------------------------------------
-- Talep 'pending_approval' durumuna girdiğinde 1. aşamayı otomatik
-- oluşturur. SECURITY DEFINER: requester rolü kendi talebini
-- oluştururken request_approvals'a insert hakkı olmadığı için gerekli.
-- ------------------------------------------------------------
create or replace function create_first_request_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chain jsonb;
  v_first jsonb;
  v_should_create boolean := false;
begin
  if tg_op = 'INSERT' and new.status = 'pending_approval' then
    v_should_create := true;
  elsif tg_op = 'UPDATE' and new.status = 'pending_approval' and old.status is distinct from 'pending_approval' then
    v_should_create := true;
  end if;

  if v_should_create then
    select approval_chain into v_chain from service_catalog_items where id = new.catalog_item_id;

    if v_chain is null or jsonb_array_length(v_chain) = 0 then
      insert into request_approvals (request_id, stage, approver_type)
      values (new.id, 1, 'tenant_admin')
      on conflict (request_id, stage) do nothing;
    else
      v_first := v_chain -> 0;
      insert into request_approvals (request_id, stage, approver_type, approver_id)
      values (
        new.id, 1, v_first ->> 'type',
        case when v_first ->> 'type' = 'specific_user' then (v_first ->> 'approver_id')::uuid else null end
      )
      on conflict (request_id, stage) do nothing;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_create_first_request_approval
  after insert or update on service_requests
  for each row execute function create_first_request_approval();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table request_approvals enable row level security;

create policy request_approvals_select on request_approvals
  for select using (
    exists (
      select 1 from service_requests sr
      where sr.id = request_approvals.request_id
        and sr.tenant_id = current_tenant_id()
        and (
          current_user_role() in ('tenant_admin', 'manager', 'agent')
          or sr.requester_id = current_profile_id()
        )
    )
  );

-- Bir sonraki aşamanın satırını oluşturmak (karar veren kişi tarafından,
-- istemci tarafında orkestre edilir — change_approvals ile aynı kalıp).
create policy request_approvals_insert on request_approvals
  for insert with check (
    exists (
      select 1 from service_requests sr
      where sr.id = request_approvals.request_id and sr.tenant_id = current_tenant_id()
    )
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

-- Karar verme: aşama tipine uygun rol/kişi.
create policy request_approvals_update on request_approvals
  for update using (
    exists (
      select 1 from service_requests sr
      where sr.id = request_approvals.request_id and sr.tenant_id = current_tenant_id()
    )
    and (
      (approver_type = 'tenant_admin' and current_user_role() = 'tenant_admin')
      or (approver_type = 'department_manager' and current_user_role() in ('manager', 'tenant_admin'))
      or (approver_type = 'specific_user' and approver_id = current_profile_id())
    )
  );
