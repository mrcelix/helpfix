-- ============================================================================
-- 0065 — Faz MP-1: Mağaza Performansı 2.0 (Şema + RPC katmanı)
--
-- Yeni varlık tablosu YOK. Hatlar ve 3. parti cihazlar configuration_items
-- üzerinde modellenir — kategori eşlemesi zaten 0052'de var
-- (configuration_items.store_health_category: esl/kiosk_pos/network/other),
-- YENİDEN EKLENMEDİ. Bu migration sadece iki yeni CI kolonu ekliyor:
--   - availability_target numeric   (SLA hedefi, örn. 99.5; null = hedefsiz)
--   - line_type text                (dsl/mpls/3g/fiber/other; null = hat değil)
-- Hat modellemesi: ci_type='network_device' + store_health_category='network'
-- + line_type dolu; isimde tip belirtilir (ör. "Mağaza X - MPLS Hattı").
--
-- Availability kaynağı device_status_events (0052) — zaman-ağırlıklı uptime:
-- periyot başında bilinen son durum yoksa periyot içindeki ilk olaya bakılır,
-- o da yoksa "veri yok" (null) döner — asla 0 sayılmaz.
--
-- RLS BOŞLUĞU DÜZELTMESİ (Faz MP-3 için gerekli): device_status_events
-- (0052) ve store_score_snapshots (0051) SELECT politikaları sadece
-- tenant_admin/manager/agent'a açıktı — requester (Çalışan Merkezi >
-- Mağazam) hiç okuyamıyordu. 0059'daki "own_site" deseniyle birebir aynı
-- yaklaşımla, requester'a SADECE KENDİ SİTESİNE ait satırlar için ek
-- (additive/permissive) SELECT politikası ekleniyor — var olan
-- tenant_admin/manager/agent erişimini DEĞİŞTİRMEZ, üzerine ekler.
--
-- Erişim modeli: security definer YOK. Her yeni RPC, configuration_items'ın
-- tenant-geneli (site kısıtı olmayan, bkz. 0005) RLS'ine ek olarak kendi
-- içinde caller_can_access_site() ile site bazlı yetki kontrolü yapar —
-- çünkü configuration_items RLS'i bilinçli olarak tenant-geneli (CMDB'nin
-- diğer kullanımları için), site bazlı kısıtlama RPC seviyesinde.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) CI kolonları
-- ---------------------------------------------------------------------------
alter table configuration_items
  add column if not exists availability_target numeric(5, 2),
  add column if not exists line_type text
    check (line_type in ('dsl', 'mpls', '3g', 'fiber', 'other'));

-- ---------------------------------------------------------------------------
-- 2) RLS boşluğu düzeltmesi — requester'a kendi sitesi için okuma izni
-- ---------------------------------------------------------------------------
create policy device_status_events_select_own_site on device_status_events
  for select using (
    tenant_id = current_tenant_id()
    and ci_id in (
      select id from configuration_items
      where site_id = (select site_id from user_profiles where id = current_profile_id())
    )
  );

create policy store_score_snapshots_select_own_site on store_score_snapshots
  for select using (
    tenant_id = current_tenant_id()
    and site_id = (select site_id from user_profiles where id = current_profile_id())
  );

-- ---------------------------------------------------------------------------
-- 3) Yardımcı: çağıran bu site'ı görebilir mi?
--    tenant_admin/manager/agent → her site. requester → SADECE kendi sitesi.
-- ---------------------------------------------------------------------------
create or replace function caller_can_access_site(p_site_id uuid)
returns boolean
language sql
stable
as $$
  select current_user_role() in ('tenant_admin', 'manager', 'agent')
    or p_site_id = (select up.site_id from user_profiles up where up.id = current_profile_id());
$$;

-- ---------------------------------------------------------------------------
-- 4) get_store_ticket_stats — çağrı durumları & skor sekmesi
--    status/priority kırılımı = SEÇİLEN PERİYOTTA AÇILAN kayıtlara göre
--    (ör. "bu ay açılan 40 kayıttan kaçı hâlâ açık"). opened/resolved/MTTR
--    ve önceki periyot karşılaştırması ayrıca hesaplanır.
-- ---------------------------------------------------------------------------
create or replace function get_store_ticket_stats(p_tenant_id uuid, p_site_id uuid, p_period text)
returns table (
  status_new int, status_open int, status_in_progress int, status_on_hold int,
  status_resolved int, status_closed int, status_merged int,
  priority_p1 int, priority_p2 int, priority_p3 int, priority_p4 int,
  opened_count int, resolved_count int, avg_resolution_hours numeric,
  prev_period_opened int, prev_period_resolved int
)
language sql
stable
as $$
  with bounds as (
    select
      case p_period
        when 'day' then date_trunc('day', now()) when 'week' then date_trunc('week', now())
        when 'month' then date_trunc('month', now()) when 'year' then date_trunc('year', now())
      end as period_start,
      now() as period_end,
      case p_period
        when 'day' then date_trunc('day', now()) - interval '1 day'
        when 'week' then date_trunc('week', now()) - interval '1 week'
        when 'month' then date_trunc('month', now()) - interval '1 month'
        when 'year' then date_trunc('year', now()) - interval '1 year'
      end as prev_start,
      case p_period
        when 'day' then date_trunc('day', now()) when 'week' then date_trunc('week', now())
        when 'month' then date_trunc('month', now()) when 'year' then date_trunc('year', now())
      end as prev_end
  ),
  created_in_period as (
    select i.* from incidents i, bounds
    where i.tenant_id = p_tenant_id and i.site_id = p_site_id
      and i.created_at >= bounds.period_start and i.created_at < bounds.period_end
      and caller_can_access_site(p_site_id)
  ),
  resolved_in_period as (
    select i.* from incidents i, bounds
    where i.tenant_id = p_tenant_id and i.site_id = p_site_id
      and i.resolved_at is not null and i.resolved_at >= bounds.period_start and i.resolved_at < bounds.period_end
      and caller_can_access_site(p_site_id)
  )
  select
    count(*) filter (where c.status = 'new')::int,
    count(*) filter (where c.status = 'open')::int,
    count(*) filter (where c.status = 'in_progress')::int,
    count(*) filter (where c.status = 'on_hold')::int,
    count(*) filter (where c.status = 'resolved')::int,
    count(*) filter (where c.status = 'closed')::int,
    count(*) filter (where c.status = 'merged')::int,
    count(*) filter (where c.priority = 'P1')::int,
    count(*) filter (where c.priority = 'P2')::int,
    count(*) filter (where c.priority = 'P3')::int,
    count(*) filter (where c.priority = 'P4')::int,
    count(*)::int,
    (select count(*) from resolved_in_period)::int,
    (select round(avg(extract(epoch from (r.resolved_at - r.created_at)) / 3600)::numeric, 1) from resolved_in_period r),
    (select count(*)::int from incidents i2, bounds
       where i2.tenant_id = p_tenant_id and i2.site_id = p_site_id
         and i2.created_at >= bounds.prev_start and i2.created_at < bounds.prev_end
         and caller_can_access_site(p_site_id)),
    (select count(*)::int from incidents i3, bounds
       where i3.tenant_id = p_tenant_id and i3.site_id = p_site_id
         and i3.resolved_at is not null and i3.resolved_at >= bounds.prev_start and i3.resolved_at < bounds.prev_end
         and caller_can_access_site(p_site_id))
  from created_in_period c;
$$;

-- ---------------------------------------------------------------------------
-- 5) get_store_availability — hatlar & 3. parti cihazlar (+ envanter, p_category
--    null iken). Zaman-ağırlıklı uptime: periyot başındaki bilinen son durum
--    (yoksa periyot içindeki ilk olay, o da yoksa "veri yok" — null) ile
--    period_end arası, ardışık olaylar arası segment sürelerine göre hesaplanır.
-- ---------------------------------------------------------------------------
create or replace function get_store_availability(
  p_tenant_id uuid,
  p_site_id uuid,
  p_period text,
  p_category store_health_category default null
)
returns table (
  ci_id uuid,
  name text,
  ci_type ci_type,
  line_type text,
  availability_percent numeric,
  availability_target numeric,
  is_currently_online boolean,
  downtime_minutes numeric,
  event_count int
)
language sql
stable
as $$
  with bounds as (
    select
      case p_period
        when 'day' then date_trunc('day', now()) when 'week' then date_trunc('week', now())
        when 'month' then date_trunc('month', now()) when 'year' then date_trunc('year', now())
      end as period_start,
      now() as period_end
  ),
  cis as (
    select ci.id, ci.name, ci.ci_type, ci.line_type, ci.is_online, ci.availability_target
    from configuration_items ci
    where ci.tenant_id = p_tenant_id
      and ci.site_id = p_site_id
      and ci.store_health_category is not null
      and (p_category is null or ci.store_health_category = p_category)
      and ci.status <> 'retired'
      and caller_can_access_site(p_site_id)
  ),
  seed as (
    -- periyot başlangıcından ÖNCEKİ (veya tam o anki) en son bilinen durum
    select distinct on (e.ci_id) e.ci_id, e.is_online as seed_state, e.occurred_at as seed_at
    from device_status_events e, bounds
    where e.occurred_at <= bounds.period_start
    order by e.ci_id, e.occurred_at desc
  ),
  first_in_period as (
    -- seed yoksa: periyot içindeki İLK olay (bilginin başladığı an)
    select distinct on (e.ci_id) e.ci_id, e.is_online as seed_state, e.occurred_at as seed_at
    from device_status_events e, bounds
    where e.occurred_at > bounds.period_start and e.occurred_at < bounds.period_end
    order by e.ci_id, e.occurred_at asc
  ),
  effective_seed as (
    select
      cis.id as ci_id,
      coalesce(seed.seed_at, first_in_period.seed_at) as eff_start,
      coalesce(seed.seed_state, first_in_period.seed_state) as eff_state,
      (seed.ci_id is not null or first_in_period.ci_id is not null) as has_data
    from cis
    left join seed on seed.ci_id = cis.id
    left join first_in_period on first_in_period.ci_id = cis.id
  ),
  timeline as (
    select es.ci_id, es.eff_start as occurred_at, es.eff_state as is_online
    from effective_seed es
    where es.has_data
    union all
    select e.ci_id, e.occurred_at, e.is_online
    from device_status_events e
    join effective_seed es on es.ci_id = e.ci_id
    where es.has_data and e.occurred_at > es.eff_start and e.occurred_at < (select period_end from bounds)
  ),
  segments as (
    select
      t.ci_id,
      t.is_online,
      t.occurred_at as seg_start,
      coalesce(lead(t.occurred_at) over (partition by t.ci_id order by t.occurred_at), (select period_end from bounds)) as seg_end
    from timeline t
  ),
  downtime as (
    select
      s.ci_id,
      sum(extract(epoch from (s.seg_end - s.seg_start))) filter (where not s.is_online) as offline_seconds,
      sum(extract(epoch from (s.seg_end - s.seg_start))) as measured_seconds
    from segments s
    group by s.ci_id
  ),
  event_counts as (
    select e.ci_id, count(*) as cnt
    from device_status_events e, bounds
    where e.occurred_at >= bounds.period_start and e.occurred_at < bounds.period_end
    group by e.ci_id
  )
  select
    cis.id,
    cis.name,
    cis.ci_type,
    cis.line_type,
    case when es.has_data
      then round((100 - (coalesce(d.offline_seconds, 0) / nullif(d.measured_seconds, 0) * 100))::numeric, 1)
      else null
    end,
    cis.availability_target,
    cis.is_online,
    case when es.has_data then round((coalesce(d.offline_seconds, 0) / 60)::numeric, 1) else null end,
    coalesce(ec.cnt, 0)::int
  from cis
  join effective_seed es on es.ci_id = cis.id
  left join downtime d on d.ci_id = cis.id
  left join event_counts ec on ec.ci_id = cis.id
  order by cis.name;
$$;

-- ---------------------------------------------------------------------------
-- 6) get_store_category_summary — kategori bazlı özet kartları
--    get_store_availability'nin ÜZERİNE kurulur, hesap mantığı tekrar
--    edilmez.
-- ---------------------------------------------------------------------------
create or replace function get_store_category_summary(p_tenant_id uuid, p_site_id uuid, p_period text)
returns table (
  category store_health_category,
  avg_availability_percent numeric,
  below_target_count int,
  total_count int
)
language sql
stable
as $$
  select
    ci.store_health_category,
    round(avg(a.availability_percent), 1),
    count(*) filter (
      where a.availability_percent is not null and a.availability_target is not null
        and a.availability_percent < a.availability_target
    )::int,
    count(*)::int
  from get_store_availability(p_tenant_id, p_site_id, p_period) a
  join configuration_items ci on ci.id = a.ci_id
  group by ci.store_health_category
  order by ci.store_health_category;
$$;

-- ---------------------------------------------------------------------------
-- 7) get_store_score_trend — periyoda uygun granülaritede skor serisi.
--    Skor mantığı ÇOĞALTILMAZ: mevcut store_score_snapshots (günlük) ve
--    store_health_scores (haftalık, compute_store_health_score'un ürettiği
--    composite_score) satırları toplanır/ortalanır.
--      day   → son 7 GÜNÜN günlük anlık görüntüsü (store_score_snapshots)
--      week  → son 8 HAFTANIN haftalık skoru (store_health_scores)
--      month → son 12 HAFTANIN haftalık skoru (store_health_scores)
--      year  → son 12 AYIN aylık ortalaması (store_health_scores, ay bazlı avg)
-- ---------------------------------------------------------------------------
create or replace function get_store_score_trend(p_tenant_id uuid, p_site_id uuid, p_period text)
returns table (period_label text, score numeric)
language sql
stable
as $$
  select x.period_label, x.score
  from (
    select snapshot_date::text as period_label, score
    from store_score_snapshots
    where tenant_id = p_tenant_id and site_id = p_site_id and p_period = 'day'
      and caller_can_access_site(p_site_id)
    order by snapshot_date desc
    limit 7
  ) x
  union all
  select x.period_label, x.score
  from (
    select week_start::text as period_label, composite_score as score
    from store_health_scores
    where tenant_id = p_tenant_id and site_id = p_site_id and p_period = 'week'
      and caller_can_access_site(p_site_id)
    order by week_start desc
    limit 8
  ) x
  union all
  select x.period_label, x.score
  from (
    select week_start::text as period_label, composite_score as score
    from store_health_scores
    where tenant_id = p_tenant_id and site_id = p_site_id and p_period = 'month'
      and caller_can_access_site(p_site_id)
    order by week_start desc
    limit 12
  ) x
  union all
  select x.period_label, x.score
  from (
    select to_char(date_trunc('month', week_start), 'YYYY-MM') as period_label, round(avg(composite_score), 1) as score
    from store_health_scores
    where tenant_id = p_tenant_id and site_id = p_site_id and p_period = 'year'
      and caller_can_access_site(p_site_id)
      and week_start >= date_trunc('year', now()) - interval '1 year'
    group by date_trunc('month', week_start)
  ) x
  order by period_label;
$$;
