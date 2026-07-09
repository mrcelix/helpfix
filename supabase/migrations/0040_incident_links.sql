-- ============================================================
-- HelpFix — 0040_incident_links.sql
-- Faz AY: İlişkili Olaylar — kayıtlar arası ilişkilendirme
-- ('related_to', 'duplicate_of', 'caused_by').
--
-- 'caused_by' özellikle Büyük Olay (War Room) senaryosu için kritik:
-- bir Büyük Olay sırasında aynı kök nedenden açılan onlarca ayrı
-- talep, hepsini "X tarafından tetiklendi" olarak bağlayıp War
-- Room'da "Bağlı N Çocuk Olay" panelinde tek yerden takip edilebilir.
--
-- Yön: incident_id SÜTUNU, linked_incident_id'DEN etkilenen/bağlı
-- taraftır. Örn. link_type='caused_by' → incident_id, linked_incident_id
-- tarafından tetiklendi (linked_incident_id = kök/ebeveyn olay).
-- ============================================================

create type incident_link_type as enum ('related_to', 'duplicate_of', 'caused_by');

create table incident_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  incident_id uuid not null references incidents(id) on delete cascade,
  linked_incident_id uuid not null references incidents(id) on delete cascade,
  link_type incident_link_type not null,
  created_by uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (incident_id <> linked_incident_id)
);

create unique index idx_incident_links_unique on incident_links(incident_id, linked_incident_id, link_type);
create index idx_incident_links_incident on incident_links(incident_id);
create index idx_incident_links_linked on incident_links(linked_incident_id);

alter table incident_links enable row level security;

create policy incident_links_select on incident_links
  for select using (tenant_id = current_tenant_id());

create policy incident_links_write on incident_links
  for all using (
    tenant_id = current_tenant_id()
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
  )
  with check (tenant_id = current_tenant_id());
