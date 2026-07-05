-- ============================================================
-- HelpFix — 0030_change_analytics.sql
-- Cila: Değişiklik Yönetimi'ne kendi Analitik sekmesi — başarı
-- trendi, onay darboğazı (hangi onay türü en çok bekletiyor), risk
-- dağılımı.
-- ============================================================

create or replace function get_change_risk_distribution(p_tenant_id uuid)
returns table (bucket text, change_count bigint)
language sql
stable
as $$
  select
    case
      when risk_score <= 30 then 'low'
      when risk_score <= 60 then 'medium'
      else 'high'
    end as bucket,
    count(*) as change_count
  from changes
  where tenant_id = p_tenant_id
  group by bucket
$$;

-- Onay darboğazı: her onay türü için ortalama bekleme süresi (saat).
-- change_approvals'ta created_at olmadığı için, ilişkili değişikliğin
-- created_at'i "onay bekleme başlangıcı" olarak kabul edilir (onay
-- satırları değişiklik gönderildiği anda oluşturulur).
create or replace function get_approval_bottleneck(p_tenant_id uuid)
returns table (approval_type approval_type, avg_wait_hours numeric, decided_count bigint)
language sql
stable
as $$
  select
    ca.approval_type,
    round(avg(extract(epoch from (ca.decided_at - c.created_at)) / 3600)::numeric, 1) as avg_wait_hours,
    count(*) as decided_count
  from change_approvals ca
  join changes c on c.id = ca.change_id
  where c.tenant_id = p_tenant_id and ca.decided_at is not null
  group by ca.approval_type
  order by avg_wait_hours desc
$$;

create or replace function get_weekly_change_success_trend(p_tenant_id uuid)
returns table (week_start date, successful_count bigint, failed_count bigint)
language sql
stable
as $$
  with weeks as (
    select generate_series(
      date_trunc('week', now() - interval '7 weeks'),
      date_trunc('week', now()),
      interval '1 week'
    )::date as week_start
  )
  select
    w.week_start,
    count(c.id) filter (where c.pir_outcome = 'successful' and c.closed_at >= w.week_start and c.closed_at < w.week_start + interval '1 week') as successful_count,
    count(c.id) filter (where c.pir_outcome in ('failed', 'rolled_back') and c.closed_at >= w.week_start and c.closed_at < w.week_start + interval '1 week') as failed_count
  from weeks w
  left join changes c on c.tenant_id = p_tenant_id
  group by w.week_start
  order by w.week_start
$$;
