-- ============================================================
-- HelpFix — seed_demo_data.sql
-- TÜM MODÜLLERE demo veri yükler: Servis Masası, Problemler,
-- Değişiklikler, Katalog, CMDB, Bilgi Bankası, SLA, Projeler,
-- İzleme, On-Call, Otomasyon, İlişkili Olaylar, Dinamik Alanlar.
--
-- ÖNEMLİ: Bu bir migration DEĞİL, tek seferlik bir SEED script'idir —
-- migrations/ klasörüne değil, elle SQL editöründen ÇALIŞTIRILMAK
-- üzere hazırlandı. Departman/SLA/tatil/kategori alanları gibi
-- benzersiz kısıtlı kayıtlar tekrar çalıştırmada çakışmayı önlemek
-- için NOT EXISTS ile korunuyor; ancak talep/olay/problem gibi doğal
-- benzersizliği olmayan kayıtlar İKİNCİ ÇALIŞTIRMADA TEKRARLANIR —
-- yani bu script'i sadece BİR KEZ çalıştırın.
--
-- Script, tenant'ınızdaki MEVCUT kullanıcıları (en az 1 tenant_admin
-- olmalı) otomatik bulup demo kayıtlara sahip/atanan olarak kullanır
-- — sahte kullanıcı oluşturmaz.
-- ============================================================

do $$
declare
  v_tenant_id uuid;
  v_admin_id uuid;
  v_manager_id uuid;
  v_agent1_id uuid;
  v_agent2_id uuid;
  v_requester_id uuid;

  v_dept_it uuid;

  v_ci_server uuid;
  v_ci_laptop uuid;
  v_ci_switch uuid;
  v_ci_printer uuid;

  v_kb1 uuid;
  v_kb2 uuid;
  v_kb3 uuid;

  v_cat_donanim uuid;
  v_cat_yazilim uuid;
  v_item_laptop uuid;
  v_item_lisans uuid;
  v_item_sifre uuid;

  v_inc_major uuid;
  v_inc_child1 uuid;
  v_inc_child2 uuid;
  v_inc_hw uuid;
  v_inc_resolved1 uuid;
  v_inc_closed uuid;
  v_inc_email uuid;
  v_inc_onhold uuid;
  v_inc_phishing uuid;
  v_inc_new uuid;

  v_prob1 uuid;
  v_prob2 uuid;

  v_chg1 uuid;
  v_chg2 uuid;
  v_chg3 uuid;

  v_proj uuid;

  v_sched uuid;
begin
  -- ---------------------------------------------------------
  -- TEMEL: tenant + mevcut kullanıcılar
  -- ---------------------------------------------------------
  select id into v_tenant_id from tenants order by created_at limit 1;
  if v_tenant_id is null then
    raise exception 'Hiç tenant bulunamadı — önce uygulamada bir hesap oluşturun.';
  end if;

  select id into v_admin_id from user_profiles where tenant_id = v_tenant_id and role = 'tenant_admin' order by created_at limit 1;
  select id into v_manager_id from user_profiles where tenant_id = v_tenant_id and role = 'manager' order by created_at limit 1;
  select id into v_agent1_id from user_profiles where tenant_id = v_tenant_id and role in ('agent', 'manager', 'tenant_admin') order by created_at limit 1 offset 0;
  select id into v_agent2_id from user_profiles where tenant_id = v_tenant_id and role in ('agent', 'manager', 'tenant_admin') order by created_at limit 1 offset 1;
  select id into v_requester_id from user_profiles where tenant_id = v_tenant_id and role = 'requester' order by created_at limit 1;

  v_manager_id := coalesce(v_manager_id, v_admin_id);
  v_agent1_id := coalesce(v_agent1_id, v_admin_id);
  v_agent2_id := coalesce(v_agent2_id, v_agent1_id, v_admin_id);
  v_requester_id := coalesce(v_requester_id, v_admin_id);

  if v_admin_id is null then
    raise exception 'Tenant içinde tenant_admin rolünde kullanıcı bulunamadı.';
  end if;

  -- ---------------------------------------------------------
  -- DEPARTMAN (yoksa oluştur)
  -- ---------------------------------------------------------
  select id into v_dept_it from departments where tenant_id = v_tenant_id and name = 'IT Operasyonları';
  if v_dept_it is null then
    insert into departments (tenant_id, name, manager_id) values (v_tenant_id, 'IT Operasyonları', v_manager_id)
    returning id into v_dept_it;
  end if;

  -- ---------------------------------------------------------
  -- CMDB — konfigürasyon öğeleri + ilişki
  -- ---------------------------------------------------------
  insert into configuration_items (tenant_id, name, ci_type, status, vendor, assigned_user_id, purchase_date, warranty_expiry, notes)
  values (v_tenant_id, 'SRV-WEB-01', 'server', 'active', 'Dell', null, '2024-03-01', '2027-03-01', 'Ana web sunucusu — üretim ortamı')
  returning id into v_ci_server;

  insert into configuration_items (tenant_id, name, ci_type, status, vendor, assigned_user_id, purchase_date, warranty_expiry)
  values (v_tenant_id, 'Ahmet''in Laptopu', 'laptop', 'active', 'Lenovo', v_agent1_id, '2024-06-15', '2027-06-15')
  returning id into v_ci_laptop;

  insert into configuration_items (tenant_id, name, ci_type, status, vendor, purchase_date, warranty_expiry)
  values (v_tenant_id, 'Cisco Core Switch', 'network_device', 'active', 'Cisco', '2023-01-10', '2026-01-10')
  returning id into v_ci_switch;

  insert into configuration_items (tenant_id, name, ci_type, status, vendor, purchase_date, warranty_expiry)
  values (v_tenant_id, 'HP LaserJet 3. Kat', 'other', 'active', 'HP', '2022-11-01', '2025-11-01')
  returning id into v_ci_printer;

  insert into ci_relationships (tenant_id, source_ci_id, target_ci_id, relationship_type)
  values
    (v_tenant_id, v_ci_server, v_ci_switch, 'connected_to'),
    (v_tenant_id, v_ci_laptop, v_ci_switch, 'connected_to');

  -- ---------------------------------------------------------
  -- BİLGİ BANKASI — 3 yayınlanmış makale
  -- ---------------------------------------------------------
  insert into knowledge_articles (tenant_id, title, content, category, status, author_id)
  values (
    v_tenant_id,
    'VPN Bağlantı Sorunlarını Giderme',
    'VPN''e bağlanamıyorsanız şu adımları izleyin: 1) İnternet bağlantınızı kontrol edin. 2) VPN istemcisini yeniden başlatın. 3) Şirket kimlik bilgilerinizle tekrar giriş yapın. 4) Sorun devam ederse şifrenizi sıfırlayın. 5) Hâlâ çözülmüyorsa Servis Masası''na talep açın.',
    'Ağ & VPN', 'published', v_agent1_id
  ) returning id into v_kb1;

  insert into knowledge_articles (tenant_id, title, content, category, status, author_id)
  values (
    v_tenant_id,
    'Şifre Sıfırlama Adımları',
    'Şifrenizi unuttuysanız giriş ekranındaki "Şifremi Unuttum" bağlantısına tıklayın, kayıtlı e-posta adresinize gelen bağlantıyla yeni bir şifre belirleyin. Şirket e-postanıza erişiminiz yoksa IT Operasyonları ile iletişime geçin.',
    'Hesap & Erişim', 'published', v_agent1_id
  ) returning id into v_kb2;

  insert into knowledge_articles (tenant_id, title, content, category, status, author_id)
  values (
    v_tenant_id,
    'Yazıcı Kurulumu Nasıl Yapılır',
    'Ağ yazıcısını eklemek için: Ayarlar > Yazıcılar > Yazıcı Ekle yolunu izleyin, "HP LaserJet 3. Kat" yazıcısını listeden seçin. Sürücü otomatik kurulmazsa BT''den destek isteyin.',
    'Donanım', 'published', v_agent2_id
  ) returning id into v_kb3;

  -- ---------------------------------------------------------
  -- SERVİS KATALOĞU — kategori + öğeler (onay zinciri + dinamik alan demoları)
  -- ---------------------------------------------------------
  insert into service_categories (tenant_id, name, sort_order) values (v_tenant_id, 'Donanım Talepleri', 1) returning id into v_cat_donanim;
  insert into service_categories (tenant_id, name, sort_order) values (v_tenant_id, 'Yazılım & Lisans', 2) returning id into v_cat_yazilim;

  insert into service_catalog_items (
    tenant_id, category_id, name, description, estimated_cost, estimated_days,
    requires_approval, approval_chain, form_schema, is_active
  ) values (
    v_tenant_id, v_cat_donanim, 'Yeni Laptop Talebi',
    'İş için yeni dizüstü bilgisayar talebi — departman yöneticisi ve Tenant Admin onayı gerekir.',
    35000, 5, true,
    '[{"type":"department_manager"},{"type":"tenant_admin"}]'::jsonb,
    '{"fields":[{"key":"marka_tercihi","label":"Marka Tercihi","type":"select","options":["Dell","Lenovo","Apple","Farketmez"]},{"key":"ram","label":"RAM Tercihi","type":"select","options":["8GB","16GB","32GB"]}]}'::jsonb,
    true
  ) returning id into v_item_laptop;

  insert into service_catalog_items (tenant_id, category_id, name, description, estimated_cost, estimated_days, requires_approval, approval_chain, is_active)
  values (
    v_tenant_id, v_cat_yazilim, 'Yazılım Lisansı Talebi', 'Adobe/Microsoft 365 gibi ücretli yazılım lisansı talebi.',
    2000, 2, true, '[{"type":"tenant_admin"}]'::jsonb, true
  ) returning id into v_item_lisans;

  insert into service_catalog_items (tenant_id, category_id, name, description, estimated_cost, estimated_days, requires_approval, is_active)
  values (v_tenant_id, v_cat_yazilim, 'Şifre Sıfırlama', 'Hesap şifresi sıfırlama — onay gerektirmez, anında karşılanır.', 0, 0, false, true)
  returning id into v_item_sifre;

  -- Örnek talepler: biri onay bekliyor (zincir otomatik tetiklenir), biri karşılandı
  insert into service_requests (tenant_id, catalog_item_id, requester_id, status, notes, form_data)
  values (v_tenant_id, v_item_laptop, v_requester_id, 'pending_approval', 'Mevcut laptopum çok yavaş kaldı, acil ihtiyacım var.', '{"marka_tercihi":"Lenovo","ram":"16GB"}'::jsonb);

  insert into service_requests (tenant_id, catalog_item_id, requester_id, status, notes, approver_id, fulfilled_at)
  values (v_tenant_id, v_item_sifre, v_requester_id, 'fulfilled', 'Şifremi hatırlamıyorum.', v_agent1_id, now() - interval '2 days');

  -- ---------------------------------------------------------
  -- TALEP ALANLARI (Servis Masası dinamik alanlar) — Donanım kategorisi
  -- ---------------------------------------------------------
  insert into ticket_category_fields (tenant_id, category_key, field_schema)
  values (
    v_tenant_id, 'hardware',
    '[{"key":"varlik_etiketi","label":"Varlık Etiketi","type":"text"},{"key":"cihaz_yasi","label":"Cihaz Yaşı","type":"select","options":["0-1 yıl","1-3 yıl","3+ yıl"]}]'::jsonb
  )
  on conflict (tenant_id, category_key) do nothing;

  -- ---------------------------------------------------------
  -- SLA POLİTİKALARI (genel, öncelik bazlı — yoksa oluştur)
  -- ---------------------------------------------------------
  insert into sla_policies (tenant_id, name, priority, response_time_minutes, resolution_time_minutes, escalation_warning_percent, business_hours_only, tier, is_active)
  select v_tenant_id, x.name, x.priority, x.response, x.resolution, 80, true, 'sla', true
  from (values
    ('Kritik Öncelik SLA', 'P1'::ticket_priority, 15, 240),
    ('Acil Öncelik SLA', 'P2'::ticket_priority, 30, 480),
    ('Normal Öncelik SLA', 'P3'::ticket_priority, 120, 1440),
    ('Düşük Öncelik SLA', 'P4'::ticket_priority, 480, 4320)
  ) as x(name, priority, response, resolution)
  where not exists (
    select 1 from sla_policies sp where sp.tenant_id = v_tenant_id and sp.priority = x.priority and sp.category is null
  );

  -- Tatil günü demosu
  insert into tenant_holidays (tenant_id, holiday_date, name)
  select v_tenant_id, date '2027-01-01', 'Yılbaşı'
  where not exists (select 1 from tenant_holidays where tenant_id = v_tenant_id and holiday_date = date '2027-01-01');

  -- ---------------------------------------------------------
  -- SERVİS MASASI — çeşitli olaylar
  -- ---------------------------------------------------------
  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id, assignee_id, ci_id, is_major_incident, major_incident_declared_at)
  values (
    v_tenant_id, 'VPN sunucusu tamamen erişilemez durumda', 'Tüm ofis VPN üzerinden bağlanamıyor, sabah 09:00''dan beri devam ediyor.',
    'P1', 'open', 'portal', 'Ağ & VPN – Diğer ağ sorunu', v_requester_id, v_agent1_id, v_ci_switch, true, now() - interval '2 hours'
  ) returning id into v_inc_major;

  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id, assignee_id)
  values (v_tenant_id, 'VPN''e bağlanamıyorum', 'Aynı VPN sorunu, ben de etkilendim.', 'P2', 'open', 'portal', 'Ağ & VPN – VPN bağlantı sorunu', v_requester_id, v_agent1_id)
  returning id into v_inc_child1;

  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id, assignee_id)
  values (v_tenant_id, 'Uzaktan çalışma VPN erişimi yok', 'Evden bağlanamıyorum, muhtemelen aynı kesinti.', 'P2', 'open', 'email', 'Ağ & VPN – VPN bağlantı sorunu', v_requester_id, v_agent1_id)
  returning id into v_inc_child2;

  insert into incident_links (tenant_id, incident_id, linked_incident_id, link_type, created_by)
  values
    (v_tenant_id, v_inc_child1, v_inc_major, 'caused_by', v_agent1_id),
    (v_tenant_id, v_inc_child2, v_inc_major, 'caused_by', v_agent1_id);

  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id, assignee_id, ci_id, custom_fields)
  values (
    v_tenant_id, 'Laptop açılmıyor', 'Sabah açmaya çalıştım, ekran hiç gelmiyor.', 'P2', 'in_progress', 'portal',
    'Donanım – Bilgisayar arızası', v_requester_id, v_agent2_id, v_ci_laptop,
    '{"varlik_etiketi":"AST-000002","cihaz_yasi":"1-3 yıl"}'::jsonb
  ) returning id into v_inc_hw;

  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id, assignee_id, csat_score, resolved_at, closed_at)
  values (
    v_tenant_id, 'Şifremi unuttum', 'Portal şifremi hatırlamıyorum, sıfırlanabilir mi?', 'P3', 'closed', 'portal',
    'Hesap & Erişim – Şifre sıfırlama', v_requester_id, v_agent1_id, 5, now() - interval '3 days', now() - interval '3 days'
  ) returning id into v_inc_resolved1;

  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id, assignee_id, resolved_at, closed_at)
  values (
    v_tenant_id, 'Klavye tuşu takılıyor', 'Space tuşu bazen basılı kalıyor.', 'P4', 'closed', 'portal',
    'Donanım – Çevre birimi (fare/klavye)', v_requester_id, v_agent2_id, now() - interval '10 days', now() - interval '9 days'
  ) returning id into v_inc_closed;

  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id, assignee_id)
  values (
    v_tenant_id, 'Outlook e-posta göndermiyor', '"Gönderiliyor" ekranında takılı kalıyor, hiç gitmiyor.', 'P2', 'on_hold', 'email',
    'E-posta & İletişim – E-posta gönderilemiyor / alınamıyor', v_requester_id, v_agent1_id
  ) returning id into v_inc_onhold;

  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id, assignee_id, csat_score, resolved_at, closed_at)
  values (
    v_tenant_id, 'Şüpheli fatura e-postası aldım', '"Fatura.pdf" ekli, göndereni tanımıyorum, tıklamadım.', 'P1', 'closed', 'portal',
    'Güvenlik – Şüpheli e-posta / phishing', v_requester_id, v_agent2_id, 4, now() - interval '5 days', now() - interval '5 days'
  ) returning id into v_inc_phishing;

  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id)
  values (v_tenant_id, 'İnternet çok yavaş', 'Sabahtan beri sayfalar çok geç açılıyor.', 'P3', 'new', 'portal', 'Ağ & VPN – Yavaş bağlantı', v_requester_id)
  returning id into v_inc_new;

  -- Birkaç yorum örneği
  insert into incident_comments (incident_id, author_id, body, is_internal)
  values
    (v_inc_major, v_agent1_id, 'Ağ ekibiyle iletişime geçtim, switch''te bir sorun olabilir. [DAHİLİ]', true),
    (v_inc_major, v_agent1_id, 'Sorunla ilgileniyoruz, en kısa sürede güncelleme paylaşacağız.', false),
    (v_inc_hw, v_agent2_id, 'Laptopu inceledim, anakart arızası olabilir, servise gönderiyorum. [DAHİLİ]', true);

  -- ---------------------------------------------------------
  -- PROBLEM YÖNETİMİ
  -- ---------------------------------------------------------
  insert into problems (tenant_id, title, description, status, priority, category, root_cause, is_known_error, known_error_workaround, owner_id)
  values (
    v_tenant_id, 'Tekrarlayan VPN kesintileri', 'Son 1 ayda VPN 3 kez kesintiye uğradı, kök neden araştırılıyor.',
    'root_cause_identified', 'P1', 'Ağ & VPN', 'Core switch''teki firmware sürümü yüksek yükte kararsızlaşıyor.',
    true, 'Geçici çözüm: switch''i mesai dışında yeniden başlatın, kalıcı çözüm için firmware güncellemesi planlanıyor (bkz. CHG kaydı).',
    v_agent1_id
  ) returning id into v_prob1;

  insert into problems (tenant_id, title, description, status, priority, category, owner_id)
  values (v_tenant_id, 'Laptoplarda erken pil bozulması', 'Son 3 ayda 4 laptopta pil arızası bildirildi, aynı seri numarası aralığında.', 'investigating', 'P3', 'Donanım', v_agent2_id)
  returning id into v_prob2;

  insert into problem_incidents (problem_id, incident_id) values (v_prob1, v_inc_major), (v_prob1, v_inc_child1), (v_prob1, v_inc_child2);

  -- ---------------------------------------------------------
  -- DEĞİŞİKLİK YÖNETİMİ
  -- ---------------------------------------------------------
  insert into changes (tenant_id, title, description, change_type, status, risk_score, category, requester_id, implementer_id, actual_start, actual_end, pir_outcome, pir_notes, closed_at)
  values (
    v_tenant_id, 'Yazıcı sürücüsü güncellemesi', 'Tüm ofiste HP yazıcı sürücülerinin güncel sürüme alınması.',
    'standard', 'closed', 25, 'Donanım', v_agent2_id, v_agent2_id, now() - interval '20 days', now() - interval '20 days',
    'successful', 'Sorunsuz tamamlandı, herhangi bir kesinti yaşanmadı.', now() - interval '19 days'
  ) returning id into v_chg1;

  -- Bu ikisi draft olarak eklenip 'submitted'e güncellenerek onay
  -- zinciri trigger'ını (create_change_approvals) doğal şekilde tetikler.
  insert into changes (tenant_id, title, description, change_type, status, risk_score, category, requester_id, implementer_id, scheduled_start, scheduled_end, rollback_plan)
  values (
    v_tenant_id, 'Core Switch Firmware Güncellemesi', 'Tekrarlayan VPN kesintilerinin kök nedenini çözecek firmware güncellemesi (bkz. PRB kaydı).',
    'normal', 'draft', 75, 'Ağ & VPN', v_agent1_id, v_agent1_id, now() + interval '3 days', now() + interval '3 days 2 hours',
    'Güncelleme başarısız olursa önceki firmware yedeğine geri dönülecek, tahmini geri alma süresi 30 dakika.'
  ) returning id into v_chg2;
  update changes set status = 'submitted' where id = v_chg2;

  insert into changes (tenant_id, title, description, change_type, status, risk_score, category, requester_id, implementer_id, scheduled_start, scheduled_end)
  values (
    v_tenant_id, 'Yeni çalışan için hesap açma otomasyonu', 'İK''dan gelen yeni işe giriş bildirimiyle otomatik AD hesabı oluşturma.',
    'standard', 'draft', 30, 'Yazılım', v_manager_id, v_agent2_id, now() + interval '7 days', now() + interval '7 days 1 hour'
  ) returning id into v_chg3;
  update changes set status = 'submitted' where id = v_chg3;

  -- ---------------------------------------------------------
  -- PROJELER
  -- ---------------------------------------------------------
  insert into projects (tenant_id, name, description, status, health, owner_id, start_date, end_date, budget)
  values (v_tenant_id, 'Ofis Ağ Altyapısı Yenileme', 'Tüm ofis ağ donanımının yenilenmesi ve VPN altyapısının modernizasyonu.', 'active', 'amber', v_manager_id, current_date - 14, current_date + 60, 250000)
  returning id into v_proj;

  insert into project_tasks (tenant_id, project_id, title, status, assignee_id, due_date, sort_order)
  values
    (v_tenant_id, v_proj, 'Mevcut ağ topolojisini haritalama', 'done', v_agent1_id, current_date - 7, 1),
    (v_tenant_id, v_proj, 'Yeni switch''lerin tedarik edilmesi', 'in_progress', v_manager_id, current_date + 10, 2),
    (v_tenant_id, v_proj, 'Kurulum ve geçiş planı', 'todo', v_agent1_id, current_date + 30, 3);

  insert into project_risks (tenant_id, project_id, title, description, impact, likelihood, status, owner_id)
  values (v_tenant_id, v_proj, 'Tedarik gecikmesi', 'Switch tedarikçisinden teslimat gecikebilir, proje takvimini etkileyebilir.', 'medium', 'medium', 'open', v_manager_id);

  -- ---------------------------------------------------------
  -- İZLEME (Monitoring)
  -- ---------------------------------------------------------
  insert into monitoring_alerts (tenant_id, source, title, description, severity, status, ci_id, incident_id)
  values (v_tenant_id, 'zabbix', 'Core Switch CPU %95 üzerinde', 'Sürekli yüksek CPU kullanımı tespit edildi, VPN kesintileriyle ilişkili olabilir.', 'critical', 'acknowledged', v_ci_switch, v_inc_major);

  insert into monitoring_alerts (tenant_id, source, title, description, severity, status, ci_id, resolved_at)
  values (v_tenant_id, 'datadog', 'SRV-WEB-01 disk kullanımı %85', 'Disk alanı azalıyor, temizlik önerilir.', 'warning', 'resolved', v_ci_server, now() - interval '1 day');

  -- ---------------------------------------------------------
  -- ON-CALL
  -- ---------------------------------------------------------
  insert into oncall_schedules (tenant_id, name) values (v_tenant_id, 'Birincil Nöbet') returning id into v_sched;

  insert into oncall_shifts (tenant_id, schedule_id, user_id, start_time, end_time)
  values
    (v_tenant_id, v_sched, v_agent1_id, date_trunc('week', now()), date_trunc('week', now()) + interval '7 days'),
    (v_tenant_id, v_sched, v_agent2_id, date_trunc('week', now()) + interval '7 days', date_trunc('week', now()) + interval '14 days');

  -- ---------------------------------------------------------
  -- OTOMASYON
  -- ---------------------------------------------------------
  insert into automation_rules (tenant_id, name, trigger_type, condition_priority, action_type, action_assignee_id, is_active)
  values (v_tenant_id, 'Kritik olayları kıdemli teknisyene ata', 'incident_created', 'P1', 'assign_to_user', v_agent1_id, true);

  raise notice 'Demo veri yükleme tamamlandı — tenant_id: %', v_tenant_id;
end $$;
