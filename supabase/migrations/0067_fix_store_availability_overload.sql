-- ============================================================================
-- 0067 — 0066'nın yarattığı fonksiyon overload çakışmasını düzelt
--
-- HATA: 0066, get_store_availability'ye p_uncategorized parametresi
-- eklerken "create or replace function" kullandı. Ama Postgres'te
-- CREATE OR REPLACE, sadece parametre listesi (tipler/sırası) BİREBİR
-- AYNIYSA var olan fonksiyonu değiştirir — trailing bir parametre eklemek
-- bile (varsayılan değeri olsa dahi) FARKLI bir overload sayılır. Sonuç:
-- veritabanında get_store_availability'nin İKİ sürümü oluştu:
--   1) (uuid, uuid, text, store_health_category)                — 0065
--   2) (uuid, uuid, text, store_health_category, boolean)        — 0066
-- get_store_category_summary gibi 3 pozisyonel argümanla çağıran yerler
-- (p_category/p_uncategorized varsayılana bırakılınca) hangi overload'ın
-- kastedildiğini seçemiyor → "is not unique" hatası.
--
-- DÜZELTME: eski (4 parametreli) overload'u AÇIKÇA kaldır, sadece 5
-- parametreli sürüm kalsın.
-- ============================================================================

drop function if exists get_store_availability(uuid, uuid, text, store_health_category);

-- Garanti olsun diye 5 parametreli sürümü aynı imzayla tekrar tanımlıyoruz
-- (0066'dakiyle birebir aynı gövde) — artık tek ve tartışmasız overload bu.
create or replace function get_store_availability(
  p_tenant_id uuid,
  p_site_id uuid,
  p_period text,
  p_category store_health_category default null,
  p_uncategorized boolean default false
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
      and (
        case
          when p_uncategorized then ci.store_health_category is null
          else ci.store_health_category is not null and (p_category is null or ci.store_health_category = p_category)
        end
      )
      and ci.status <> 'retired'
      and caller_can_access_site(p_site_id)
  ),
  seed as (
    select distinct on (e.ci_id) e.ci_id, e.is_online as seed_state, e.occurred_at as seed_at
    from device_status_events e, bounds
    where e.occurred_at <= bounds.period_start
    order by e.ci_id, e.occurred_at desc
  ),
  first_in_period as (
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
