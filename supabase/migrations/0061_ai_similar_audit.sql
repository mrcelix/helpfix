-- ============================================================================
-- 0061 — Faz 1 (AI Derinleştirme): Benzer Kayıtlar + AI Denetim İzi
--
-- 1) incidents.search_tsv — Türkçe full-text (generated column + GIN index)
-- 2) find_similar_incidents() — aynı tenant'taki benzer ÇÖZÜLMÜŞ kayıtlar.
--    security invoker: incidents RLS'i (tenant_id = current_tenant_id())
--    zaten devrede, ekstra delik açmıyoruz.
-- 3) ai_events — her AI kullanımı ve agent kararı için denetim izi.
--    Amaç: (a) yönetişim/açıklanabilirlik, (b) Faz 3 Insights için
--    isabet/deflection metriklerinin ham verisi.
--    tenant_id/actor_id, 0001'deki current_tenant_id()/current_profile_id()
--    yardımcılarından default alır — istemci sadece event_type + output verir.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Türkçe arama vektörü
-- ---------------------------------------------------------------------------
alter table incidents
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('turkish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('turkish', coalesce(description, '')), 'B')
  ) stored;

create index if not exists idx_incidents_search_tsv
  on incidents using gin (search_tsv);

-- ---------------------------------------------------------------------------
-- 2) Benzer çözülmüş kayıtlar
-- ---------------------------------------------------------------------------
create or replace function find_similar_incidents(p_incident_id uuid, p_limit int default 5)
returns table (
  id uuid,
  ref text,
  title text,
  status ticket_status,
  priority ticket_priority,
  similarity real,
  created_at timestamptz
)
language sql
stable
as $$
  with src as (
    select plainto_tsquery('turkish', left(i.title || ' ' || coalesce(i.description, ''), 500)) as q
    from incidents i
    where i.id = p_incident_id
  )
  select i.id, i.ref, i.title, i.status, i.priority,
         ts_rank(i.search_tsv, src.q) as similarity,
         i.created_at
  from incidents i, src
  where i.id <> p_incident_id
    and i.status in ('resolved', 'closed')
    and src.q @@ i.search_tsv
  order by similarity desc
  limit p_limit;
$$;

-- ---------------------------------------------------------------------------
-- 3) AI denetim izi
-- ---------------------------------------------------------------------------
create table if not exists ai_events (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null default current_tenant_id()
                references tenants(id) on delete cascade,
  incident_id uuid references incidents(id) on delete set null,
  actor_id    uuid default current_profile_id()
                references user_profiles(id) on delete set null,
  event_type  text not null check (event_type in (
                'triage_run',        -- öneri üretildi
                'triage_accepted',   -- agent uyguladı (isabet metriği)
                'triage_rejected',   -- agent reddetti
                'summary_run',       -- özet üretildi
                'draft_run',         -- yanıt taslağı üretildi
                'chat_deflected',    -- ai-chat sorunu talep açmadan çözdü (Faz 2 metriği)
                'chat_escalated'     -- ai-chat talep açtı
              )),
  output      jsonb,                 -- öneri/karar içeriği (denetim için)
  created_at  timestamptz not null default now()
);

create index if not exists idx_ai_events_tenant_time
  on ai_events (tenant_id, created_at desc);
create index if not exists idx_ai_events_incident
  on ai_events (incident_id);

alter table ai_events enable row level security;

create policy ai_events_select on ai_events
  for select using (tenant_id = current_tenant_id());

create policy ai_events_insert on ai_events
  for insert with check (tenant_id = current_tenant_id());
