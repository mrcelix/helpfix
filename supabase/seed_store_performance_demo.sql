-- ============================================================
-- HelpFix — seed_store_performance_demo.sql
-- Mağaza Performansı (Faz BM) + Mağaza IT Sağlığı Skoru (Faz BN)
-- modüllerini uçtan uca test edebilmek için demo veri.
--
-- ÖNEMLİ: Bu bir migration DEĞİL, tek seferlik bir SEED script'idir.
-- Sadece BİR KEZ çalıştırın.
--
-- Ne yükler:
--   - 1 bölge (Marmara Bölgesi) + 3 mağaza (Kadıköy, Beşiktaş, Bakırköy)
--   - Her mağazaya bölge yöneticisi ataması
--   - Her mağazaya ESL (2), Kiosk & Mobil Kasa (2), Network (1) cihazı
--     — bazıları bilinçli olarak OFFLINE bırakılıyor ki skor farklı
--     mağazalar arasında anlamlı şekilde ayrışsın (A/B/C çeşitliliği)
--   - Network cihazında geçmişe dönük bir kesinti olayı
--   - Bir kiosk cihazında tekrar eden arıza (2 offline olayı)
--   - Bir mağazada "geç açılma" operasyonel olayı
--   - Mağazalara bağlı birkaç Servis Masası talebi
--   - Bu haftanın Mağaza IT Sağlığı Skoru (A/B/C) hesaplanıp kaydedilir
--   - Geçmiş trendi göstermek için önceki haftaya örnek skor satırı
-- ============================================================

do $$
declare
  v_tenant_id uuid;
  v_admin_id uuid;
  v_manager_id uuid;
  v_agent1_id uuid;
  v_requester_id uuid;

  v_region_id uuid;
  v_site_kadikoy uuid;
  v_site_besiktas uuid;
  v_site_bakirkoy uuid;

  v_ci_esl1 uuid;
  v_ci_kiosk1 uuid;
  v_ci_network uuid;

  v_week_start date := date_trunc('week', current_date)::date;
  v_last_week date := v_week_start - 7;
begin
  select id into v_tenant_id from tenants order by created_at limit 1;
  if v_tenant_id is null then
    raise exception 'Hiç tenant bulunamadı.';
  end if;

  select id into v_admin_id from user_profiles where tenant_id = v_tenant_id and role = 'tenant_admin' order by created_at limit 1;
  select id into v_manager_id from user_profiles where tenant_id = v_tenant_id and role = 'manager' order by created_at limit 1;
  select id into v_agent1_id from user_profiles where tenant_id = v_tenant_id and role in ('agent', 'manager', 'tenant_admin') order by created_at limit 1;
  select id into v_requester_id from user_profiles where tenant_id = v_tenant_id order by created_at desc limit 1;

  v_manager_id := coalesce(v_manager_id, v_admin_id);
  v_agent1_id := coalesce(v_agent1_id, v_admin_id);
  v_requester_id := coalesce(v_requester_id, v_admin_id);

  if v_admin_id is null then
    raise exception 'Tenant içinde tenant_admin bulunamadı.';
  end if;

  insert into sites (tenant_id, name, city, is_headquarters, manager_id)
  values (v_tenant_id, 'Marmara Bölgesi', 'İstanbul', false, v_manager_id)
  returning id into v_region_id;

  insert into sites (tenant_id, name, city, parent_site_id, manager_id)
  values (v_tenant_id, 'Kadıköy Mağazası', 'İstanbul', v_region_id, v_manager_id)
  returning id into v_site_kadikoy;

  insert into sites (tenant_id, name, city, parent_site_id, manager_id)
  values (v_tenant_id, 'Beşiktaş Mağazası', 'İstanbul', v_region_id, v_manager_id)
  returning id into v_site_besiktas;

  insert into sites (tenant_id, name, city, parent_site_id, manager_id)
  values (v_tenant_id, 'Bakırköy Mağazası', 'İstanbul', v_region_id, v_manager_id)
  returning id into v_site_bakirkoy;

  -- KADIKÖY — sağlıklı mağaza
  insert into configuration_items (tenant_id, name, ci_type, status, site_id, store_health_category, is_online)
  values
    (v_tenant_id, 'ESL Reyon-1 (Kadıköy)', 'other', 'active', v_site_kadikoy, 'esl', true),
    (v_tenant_id, 'ESL Reyon-2 (Kadıköy)', 'other', 'active', v_site_kadikoy, 'esl', true),
    (v_tenant_id, 'Kiosk-1 (Kadıköy)', 'other', 'active', v_site_kadikoy, 'kiosk_pos', true),
    (v_tenant_id, 'Mobil Kasa-1 (Kadıköy)', 'other', 'active', v_site_kadikoy, 'kiosk_pos', true),
    (v_tenant_id, 'Ana Switch (Kadıköy)', 'network_device', 'active', v_site_kadikoy, 'network', true);

  -- BEŞİKTAŞ — orta seviye sorunlu mağaza
  insert into configuration_items (tenant_id, name, ci_type, status, site_id, store_health_category, is_online)
  values (v_tenant_id, 'ESL Reyon-1 (Beşiktaş)', 'other', 'active', v_site_besiktas, 'esl', true);

  insert into configuration_items (tenant_id, name, ci_type, status, site_id, store_health_category, is_online)
  values (v_tenant_id, 'ESL Reyon-2 (Beşiktaş)', 'other', 'active', v_site_besiktas, 'esl', false);

  insert into configuration_items (tenant_id, name, ci_type, status, site_id, store_health_category, is_online)
  values (v_tenant_id, 'Kiosk-1 (Beşiktaş)', 'other', 'active', v_site_besiktas, 'kiosk_pos', true)
  returning id into v_ci_kiosk1;

  insert into configuration_items (tenant_id, name, ci_type, status, site_id, store_health_category, is_online)
  values (v_tenant_id, 'Mobil Kasa-1 (Beşiktaş)', 'other', 'active', v_site_besiktas, 'kiosk_pos', true);

  insert into configuration_items (tenant_id, name, ci_type, status, site_id, store_health_category, is_online)
  values (v_tenant_id, 'Ana Switch (Beşiktaş)', 'network_device', 'active', v_site_besiktas, 'network', true)
  returning id into v_ci_network;

  insert into device_status_events (tenant_id, ci_id, is_online, occurred_at) values
    (v_tenant_id, v_ci_kiosk1, false, v_week_start + interval '1 day 10 hours'),
    (v_tenant_id, v_ci_kiosk1, true, v_week_start + interval '1 day 10 hours 20 minutes'),
    (v_tenant_id, v_ci_kiosk1, false, v_week_start + interval '3 days 14 hours'),
    (v_tenant_id, v_ci_kiosk1, true, v_week_start + interval '3 days 14 hours 15 minutes');

  insert into device_status_events (tenant_id, ci_id, is_online, occurred_at) values
    (v_tenant_id, v_ci_network, false, v_week_start + interval '2 days 9 hours'),
    (v_tenant_id, v_ci_network, true, v_week_start + interval '2 days 9 hours 45 minutes');

  insert into store_operational_events (tenant_id, site_id, event_type, occurred_at, note, source, created_by)
  values (v_tenant_id, v_site_besiktas, 'late_opening', v_week_start + interval '1 day 8 hours 45 minutes', 'Açılış 45 dakika gecikti — anahtar teslim sorunu', 'manual', v_agent1_id);

  -- BAKIRKÖY — sorunlu mağaza
  insert into configuration_items (tenant_id, name, ci_type, status, site_id, store_health_category, is_online)
  values (v_tenant_id, 'ESL Reyon-1 (Bakırköy)', 'other', 'active', v_site_bakirkoy, 'esl', false)
  returning id into v_ci_esl1;

  insert into configuration_items (tenant_id, name, ci_type, status, site_id, store_health_category, is_online)
  values
    (v_tenant_id, 'ESL Reyon-2 (Bakırköy)', 'other', 'active', v_site_bakirkoy, 'esl', false),
    (v_tenant_id, 'Kiosk-1 (Bakırköy)', 'other', 'active', v_site_bakirkoy, 'kiosk_pos', false),
    (v_tenant_id, 'Mobil Kasa-1 (Bakırköy)', 'other', 'active', v_site_bakirkoy, 'kiosk_pos', true),
    (v_tenant_id, 'Ana Switch (Bakırköy)', 'network_device', 'active', v_site_bakirkoy, 'network', true);

  -- SERVİS MASASI TALEPLERİ
  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id, assignee_id, site_id, ci_id)
  values (
    v_tenant_id, 'Bakırköy''de ESL ekranları toplu çöktü', 'Reyon etiketlerinin tamamı yanmıyor, fiyat güncellemeleri yansımıyor.',
    'P1', 'open', 'portal', 'Donanım – Diğer donanım', v_requester_id, v_agent1_id, v_site_bakirkoy, v_ci_esl1
  );

  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id, assignee_id, site_id, resolved_at, csat_score)
  values (
    v_tenant_id, 'Beşiktaş kiosk yeniden başlatma talebi', 'Kiosk-1 donmuş, yeniden başlatılması gerekiyor.',
    'P3', 'closed', 'portal', 'Donanım – Diğer donanım', v_requester_id, v_agent1_id, v_site_besiktas, now() - interval '2 days', 4
  );

  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id, assignee_id, site_id, resolved_at, csat_score)
  values (
    v_tenant_id, 'Kadıköy mağazasında yazıcı kağıt sıkışması', 'Fiş yazıcısı kağıt sıkıştırıyor.',
    'P4', 'closed', 'portal', 'Donanım – Diğer donanım', v_requester_id, v_agent1_id, v_site_kadikoy, now() - interval '1 day', 5
  );

  -- BU HAFTANIN SAĞLIK SKORUNU HESAPLA
  perform generate_weekly_store_health_scores(v_tenant_id, v_week_start);

  -- Geçmiş trendi için önceki haftaya örnek skor
  insert into store_health_scores (
    tenant_id, site_id, week_start, esl_score, kiosk_score, network_score, helpdesk_score,
    composite_score, letter_grade, esl_offline_pct, kiosk_uptime_pct, network_downtime_minutes,
    helpdesk_call_count, helpdesk_sla_breach_count
  )
  select v_tenant_id, v_site_kadikoy, v_last_week, 92.0, 88.0, 95.0, 90.0, 91.3, 'A', 5.0, 95.0, 10, 3, 0
  on conflict (site_id, week_start) do nothing;

  insert into store_health_scores (
    tenant_id, site_id, week_start, esl_score, kiosk_score, network_score, helpdesk_score,
    composite_score, letter_grade, esl_offline_pct, kiosk_uptime_pct, network_downtime_minutes,
    helpdesk_call_count, helpdesk_sla_breach_count
  )
  select v_tenant_id, v_site_besiktas, v_last_week, 78.0, 70.0, 82.0, 75.0, 76.3, 'B', 15.0, 80.0, 55, 6, 1
  on conflict (site_id, week_start) do nothing;

  insert into store_health_scores (
    tenant_id, site_id, week_start, esl_score, kiosk_score, network_score, helpdesk_score,
    composite_score, letter_grade, esl_offline_pct, kiosk_uptime_pct, network_downtime_minutes,
    helpdesk_call_count, helpdesk_sla_breach_count
  )
  select v_tenant_id, v_site_bakirkoy, v_last_week, 55.0, 60.0, 88.0, 50.0, 63.3, 'C', 40.0, 65.0, 20, 9, 3
  on conflict (site_id, week_start) do nothing;

  -- Faz BM (genel skor kartı) için de anlık görüntü al
  perform capture_store_score_snapshots(v_tenant_id);

  raise notice 'Mağaza Performansı demo verisi yüklendi — bölge: %, mağazalar: Kadıköy/Beşiktaş/Bakırköy', v_region_id;
end $$;
