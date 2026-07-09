-- ============================================================
-- HelpFix — 0039_kb_deflection.sql
-- Faz AX: Bilgi Bankası Deflection — Yeni Talep sihirbazında Konu/
-- Açıklama yazılırken, olası çözümü içeren yayınlanmış makaleleri
-- gerçek zamanlı önermek için tam metin arama altyapısı.
--
-- Postgres'in yerleşik 'turkish' text search config'i kullanılıyor
-- (kök bulma / stemming Türkçe için otomatik çalışır — ekstra
-- sözlük kurulumu gerekmez).
-- ============================================================

alter table knowledge_articles
  add column search_vector tsvector
  generated always as (
    to_tsvector('turkish', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored;

create index idx_kb_search_vector on knowledge_articles using gin(search_vector);

-- ------------------------------------------------------------
-- Yayınlanmış makaleler içinde arama yapıp alaka düzeyine göre
-- sıralı sonuç döner. RLS'e tabi (kb_select politikası zaten
-- published makaleleri tenant içi herkese açık tutuyor).
-- ------------------------------------------------------------
create or replace function search_kb_articles(p_tenant_id uuid, p_query text, p_limit int default 4)
returns table(id uuid, title text, slug text, category text, rank real)
language sql
stable
as $$
  select
    id,
    title,
    slug,
    category,
    ts_rank(search_vector, websearch_to_tsquery('turkish', p_query)) as rank
  from knowledge_articles
  where tenant_id = p_tenant_id
    and status = 'published'
    and search_vector @@ websearch_to_tsquery('turkish', p_query)
  order by rank desc
  limit p_limit
$$;
