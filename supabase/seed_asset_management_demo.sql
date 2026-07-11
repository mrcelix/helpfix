-- ============================================================
-- HelpFix — seed_asset_management_demo.sql
-- Faz BS (Varlık Modelleri, Checkout/Checkin, Sarf Malzemeleri,
-- Özel Alanlar) + Faz BO (İş Hizmetleri) için demo veri.
--
-- ÖNEMLİ: Migration değil, tek seferlik SEED script'i — sadece
-- BİR KEZ çalıştırın.
--
-- Ne yükler:
--   - 5 Varlık Modeli (Dell Latitude, Dell PowerEdge, HP LaserJet,
--     Cisco Catalyst, iPhone 13)
--   - Laptop ve Server tiplerine özel alan tanımları (CPU/RAM,
--     Rack Konumu/IP Adresi)
--   - 3 yeni CI: modele bağlı, özel alanları dolu
--   - Checkout/Checkin geçmişi: biri hâlâ zimmetli, biri iade edilmiş
--   - 3 sarf malzemesi/aksesuar kalemi + gerçekçi checkout'lar
--     (biri bilinçli olarak düşük stok göstermesi için)
--   - 2 İş Hizmeti (E-posta, VPN) + varsa mevcut bir network CI'a
--     bağlanır + birer örnek olay
-- ============================================================

do $$
declare
  v_tenant_id uuid;
  v_admin_id uuid;
  v_manager_id uuid;
  v_agent1_id uuid;
  v_agent2_id uuid;
  v_requester_id uuid;

  v_model_laptop uuid;
  v_model_server uuid;

  v_ci_laptop1 uuid;
  v_ci_laptop2 uuid;
  v_ci_server uuid;
  v_existing_network_ci uuid;

  v_consumable_toner uuid;
  v_consumable_cable uuid;
  v_consumable_mouse uuid;

  v_service_email uuid;
  v_service_vpn uuid;
begin
  select id into v_tenant_id from tenants order by created_at limit 1;
  if v_tenant_id is null then
    raise exception 'Hiç tenant bulunamadı.';
  end if;

  select id into v_admin_id from user_profiles where tenant_id = v_tenant_id and role = 'tenant_admin' order by created_at limit 1;
  select id into v_manager_id from user_profiles where tenant_id = v_tenant_id and role = 'manager' order by created_at limit 1;
  select id into v_agent1_id from user_profiles where tenant_id = v_tenant_id and role in ('agent', 'manager', 'tenant_admin') order by created_at limit 1 offset 0;
  select id into v_agent2_id from user_profiles where tenant_id = v_tenant_id and role in ('agent', 'manager', 'tenant_admin') order by created_at limit 1 offset 1;
  select id into v_requester_id from user_profiles where tenant_id = v_tenant_id order by created_at desc limit 1;

  v_manager_id := coalesce(v_manager_id, v_admin_id);
  v_agent1_id := coalesce(v_agent1_id, v_admin_id);
  v_agent2_id := coalesce(v_agent2_id, v_agent1_id, v_admin_id);
  v_requester_id := coalesce(v_requester_id, v_admin_id);

  if v_admin_id is null then
    raise exception 'Tenant içinde tenant_admin bulunamadı.';
  end if;

  insert into asset_models (tenant_id, name, manufacturer, ci_type) values (v_tenant_id, 'Latitude 5440', 'Dell', 'laptop') returning id into v_model_laptop;
  insert into asset_models (tenant_id, name, manufacturer, ci_type) values (v_tenant_id, 'PowerEdge R650', 'Dell', 'server') returning id into v_model_server;
  insert into asset_models (tenant_id, name, manufacturer, ci_type) values (v_tenant_id, 'LaserJet Pro M404dn', 'HP', 'other');
  insert into asset_models (tenant_id, name, manufacturer, ci_type) values (v_tenant_id, 'Catalyst 9200', 'Cisco', 'network_device');
  insert into asset_models (tenant_id, name, manufacturer, ci_type) values (v_tenant_id, 'iPhone 13', 'Apple', 'mobile_device');

  insert into ci_type_fields (tenant_id, ci_type, field_schema)
  values (v_tenant_id, 'laptop', '[{"key":"cpu","label":"İşlemci","type":"text"},{"key":"ram","label":"RAM","type":"select","options":["8GB","16GB","32GB"]}]'::jsonb)
  on conflict (tenant_id, ci_type) do nothing;

  insert into ci_type_fields (tenant_id, ci_type, field_schema)
  values (v_tenant_id, 'server', '[{"key":"rack_konumu","label":"Rack Konumu","type":"text"},{"key":"ip_adresi","label":"IP Adresi","type":"text"}]'::jsonb)
  on conflict (tenant_id, ci_type) do nothing;

  insert into configuration_items (tenant_id, name, ci_type, status, model_id, vendor, custom_fields, assigned_user_id)
  values (v_tenant_id, 'Ahmet''in Yeni Laptopu', 'laptop', 'active', v_model_laptop, 'Dell', '{"cpu":"Intel Core i7-1355U","ram":"16GB"}'::jsonb, v_agent1_id)
  returning id into v_ci_laptop1;

  insert into configuration_items (tenant_id, name, ci_type, status, model_id, vendor, custom_fields)
  values (v_tenant_id, 'Depo Yedek Laptop', 'laptop', 'active', v_model_laptop, 'Dell', '{"cpu":"Intel Core i5-1335U","ram":"8GB"}'::jsonb)
  returning id into v_ci_laptop2;

  insert into configuration_items (tenant_id, name, ci_type, status, model_id, vendor, custom_fields)
  values (v_tenant_id, 'DB Sunucusu-01', 'server', 'active', v_model_server, 'Dell', '{"rack_konumu":"Rack-3 U12","ip_adresi":"10.0.4.15"}'::jsonb)
  returning id into v_ci_server;

  insert into ci_checkout_history (tenant_id, ci_id, checked_out_to, checked_out_by, checked_out_at)
  values (v_tenant_id, v_ci_laptop1, v_agent1_id, v_admin_id, now() - interval '30 days');

  insert into ci_checkout_history (tenant_id, ci_id, checked_out_to, checked_out_by, checked_out_at, checked_in_at, checked_in_by)
  values (v_tenant_id, v_ci_laptop2, v_requester_id, v_admin_id, now() - interval '60 days', now() - interval '20 days', v_agent1_id);

  insert into consumable_items (tenant_id, name, category, is_returnable, total_quantity, low_stock_threshold, unit_cost)
  values (v_tenant_id, 'HP 05A Toner', 'Toner', false, 20, 5, 850)
  returning id into v_consumable_toner;

  insert into consumable_items (tenant_id, name, category, is_returnable, total_quantity, low_stock_threshold, unit_cost)
  values (v_tenant_id, 'USB-C Şarj Kablosu', 'Kablo', false, 8, 10, 120)
  returning id into v_consumable_cable;

  insert into consumable_items (tenant_id, name, category, is_returnable, total_quantity, low_stock_threshold, unit_cost)
  values (v_tenant_id, 'Kablosuz Mouse', 'Çevre Birimi', true, 15, 3, 350)
  returning id into v_consumable_mouse;

  insert into consumable_checkouts (tenant_id, consumable_id, user_id, quantity, checked_out_by)
  values (v_tenant_id, v_consumable_toner, v_agent1_id, 3, v_admin_id);

  insert into consumable_checkouts (tenant_id, consumable_id, user_id, quantity, checked_out_by)
  values (v_tenant_id, v_consumable_cable, v_requester_id, 2, v_admin_id);

  insert into consumable_checkouts (tenant_id, consumable_id, user_id, quantity, checked_out_by)
  values (v_tenant_id, v_consumable_mouse, v_agent2_id, 1, v_admin_id);

  insert into consumable_checkouts (tenant_id, consumable_id, user_id, quantity, checked_out_by, checked_in_at)
  values (v_tenant_id, v_consumable_mouse, v_requester_id, 1, v_admin_id, now() - interval '5 days');

  insert into business_services (tenant_id, name, description, criticality, owner_id)
  values (v_tenant_id, 'E-posta Hizmeti', 'Kurumsal e-posta ve takvim hizmeti', 'high', v_manager_id)
  returning id into v_service_email;

  insert into business_services (tenant_id, name, description, criticality, owner_id)
  values (v_tenant_id, 'VPN Hizmeti', 'Uzaktan erişim VPN altyapısı', 'critical', v_manager_id)
  returning id into v_service_vpn;

  select id into v_existing_network_ci from configuration_items where tenant_id = v_tenant_id and ci_type = 'network_device' order by created_at limit 1;
  if v_existing_network_ci is not null then
    insert into business_service_cis (business_service_id, ci_id) values (v_service_vpn, v_existing_network_ci) on conflict do nothing;
  end if;
  insert into business_service_cis (business_service_id, ci_id) values (v_service_email, v_ci_server) on conflict do nothing;

  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id, assignee_id, business_service_id)
  values (v_tenant_id, 'Outlook senkronizasyon hatası', 'E-postalar 2 saattir gelmiyor.', 'P2', 'open', 'portal', 'E-posta & İletişim – E-posta gönderilemiyor / alınamıyor', v_requester_id, v_agent1_id, v_service_email);

  insert into incidents (tenant_id, title, description, priority, status, channel, category, requester_id, assignee_id, business_service_id, resolved_at, csat_score)
  values (v_tenant_id, 'VPN bağlantısı zaman zaman kopuyor', 'Uzaktan çalışırken VPN bağlantısı kesiliyor, tekrar bağlanmak gerekiyor.', 'P3', 'closed', 'portal', 'Ağ & VPN – VPN bağlantı sorunu', v_requester_id, v_agent2_id, v_service_vpn, now() - interval '3 days', 4);

  raise notice 'Varlık Yönetimi + İş Hizmetleri demo verisi yüklendi.';
end $$;
