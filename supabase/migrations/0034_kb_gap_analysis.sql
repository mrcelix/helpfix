-- ============================================================
-- HelpFix — 0034_kb_gap_analysis.sql
-- Cila: Bilgi Yönetimi'ne Bilgi Boşluğu Analizi — hangi aramaların
-- sonuçsuz kaldığını loglayıp yöneticiye gösterir (hangi makalenin
-- eksik olduğunu bulmak için gerçek bir sinyal).
-- ============================================================

create table kb_search_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  query text not null,
  result_count int not null,
  searched_by uuid references user_profiles(id),
  created_at timestamptz not null default now()
);

create index idx_kb_search_log_tenant on kb_search_log(tenant_id, created_at desc);

alter table kb_search_log enable row level security;

create policy kb_search_log_select on kb_search_log
  for select using (
    tenant_id = current_tenant_id() and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

create policy kb_search_log_insert on kb_search_log
  for insert with check (tenant_id = current_tenant_id());

create or replace function get_kb_gap_analysis(p_tenant_id uuid)
returns table (query text, search_count bigint, last_searched timestamptz)
language sql
stable
as $$
  select query, count(*) as search_count, max(created_at) as last_searched
  from kb_search_log
  where tenant_id = p_tenant_id and result_count = 0
  group by query
  order by search_count desc
  limit 20
$$;
