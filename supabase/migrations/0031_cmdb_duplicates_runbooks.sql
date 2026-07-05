-- ============================================================
-- HelpFix — 0031_cmdb_duplicates_runbooks.sql
-- Cila: (1) CMDB Yinelenen Varlık Tespiti — aynı isimde birden fazla
-- varlık var mı kontrolü. (2) Olay/İzleme'ye Runbook'lar — bir uyarı
-- başlığı belirli bir anahtar kelimeyle eşleşince gösterilecek,
-- önceden tanımlı adım listesi (gerçek otomatik iyileştirme değil,
-- ama gerçek ve kullanışlı bir kontrol listesi).
-- ============================================================

create or replace function get_duplicate_ci_names(p_tenant_id uuid)
returns table (name text, ci_count bigint, ci_ids uuid[])
language sql
stable
as $$
  select lower(name) as name, count(*) as ci_count, array_agg(id) as ci_ids
  from configuration_items
  where tenant_id = p_tenant_id
  group by lower(name)
  having count(*) > 1
$$;

create table monitoring_runbooks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  trigger_keyword text not null,
  title text not null,
  steps text not null, -- satır satır adımlar (\n ile ayrılmış)
  created_at timestamptz not null default now()
);

alter table monitoring_runbooks enable row level security;

create policy runbooks_select on monitoring_runbooks
  for select using (tenant_id = current_tenant_id());

create policy runbooks_write on monitoring_runbooks
  for all using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager')
  )
  with check (tenant_id = current_tenant_id());
