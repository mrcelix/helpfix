-- ============================================================
-- HelpFix — 0059_employee_store_visibility.sql
-- Faz BV: Çalışan Merkezi — "Mağazam" görünümü için RLS genişletmesi.
--
-- Bir çalışan (requester) artık kendi profiline atanmış mağazaya
-- (user_profiles.site_id) ait şu verileri görebilir:
--   - O mağazanın haftalık BT Sağlık Skoru (A/B/C, 4 sütun)
--   - O mağazadaki TÜM Servis Masası kayıtları (önceden sadece
--     kendi açtığı talepleri görebiliyordu — mağaza bazlı analiz
--     için bu, EK bir izin olarak genişletildi, var olan "sadece
--     kendi taleplerim" davranışını DEĞİŞTİRMEZ, üzerine ekler).
--
-- configuration_items ve consumable_items zaten tenant geneli
-- okunabilir durumdaydı (bkz. 0005, 0056) — ek politika gerekmedi,
-- Çalışan Merkezi tarafında site_id'ye göre filtrelenecek.
-- ============================================================

create policy incidents_select_own_site on incidents
  for select using (
    tenant_id = current_tenant_id()
    and site_id is not null
    and site_id = (select site_id from user_profiles where id = current_profile_id())
  );

create policy store_health_scores_select_own_site on store_health_scores
  for select using (
    tenant_id = current_tenant_id()
    and site_id = (select site_id from user_profiles where id = current_profile_id())
  );
