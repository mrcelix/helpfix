-- ============================================================
-- HelpFix — 0006_knowledge_base.sql
-- Bilgi Yönetimi: makaleler, taslak/yayın durumu, görüntülenme ve
-- faydalı/faydasız oylama sayaçları.
-- ============================================================

create type article_status as enum ('draft', 'published', 'archived');

create table knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  slug text not null,
  content text not null,
  category text,
  status article_status not null default 'draft',
  author_id uuid not null references user_profiles(id),
  view_count int not null default 0,
  helpful_count int not null default 0,
  unhelpful_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create unique index idx_kb_tenant_slug on knowledge_articles(tenant_id, slug);
create index idx_kb_tenant on knowledge_articles(tenant_id);
create index idx_kb_status on knowledge_articles(tenant_id, status);
create index idx_kb_category on knowledge_articles(tenant_id, category);

create trigger trg_kb_touch
  before update on knowledge_articles
  for each row execute function touch_updated_at();

-- Slug otomatik üretimi (başlıktan, Türkçe karakterleri normalize ederek)
create or replace function slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      lower(
        translate(input, 'çğıöşüÇĞİÖŞÜ', 'cgiosuCGIOSU')
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  )
$$;

create or replace function set_kb_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := slugify(new.title) || '-' || substr(new.id::text, 1, 6);
  end if;
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger trg_kb_slug
  before insert or update on knowledge_articles
  for each row execute function set_kb_slug();

-- Görüntülenme sayacını artıran RPC — RLS'e takılmadan (security definer)
-- çalışır, çünkü bir okuma işlemi bir "yazma" saymamalı.
create or replace function increment_article_view(p_article_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update knowledge_articles set view_count = view_count + 1 where id = p_article_id
$$;

create or replace function vote_article(p_article_id uuid, p_helpful boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update knowledge_articles
  set
    helpful_count = helpful_count + case when p_helpful then 1 else 0 end,
    unhelpful_count = unhelpful_count + case when p_helpful then 0 else 1 end
  where id = p_article_id
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table knowledge_articles enable row level security;

-- Yayınlanan makaleler tenant içindeki herkese açık (requester dahil —
-- Çalışan Merkezi bunu okuyacak). Taslak/arşiv sadece agent+ ve yazarın
-- kendisi tarafından görülür.
create policy kb_select on knowledge_articles
  for select using (
    tenant_id = current_tenant_id()
    and (
      status = 'published'
      or current_user_role() in ('tenant_admin', 'manager', 'agent')
      or author_id = current_profile_id()
    )
  );

create policy kb_write on knowledge_articles
  for all using (
    tenant_id = current_tenant_id()
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
  )
  with check (tenant_id = current_tenant_id());
