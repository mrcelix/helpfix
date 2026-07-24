-- ============================================================
-- HelpFix — 0071_store_score_snapshot_cron.sql
--
-- Mağaza Performansı > Geçmiş sekmesindeki "Günlük" periyot görünümü
-- (get_store_score_trend, p_period='day') capture_store_score_snapshots
-- fonksiyonunun HER GÜN çalıştığını varsayıyor, ama 0051_store_
-- performance.sql'den bu yana fonksiyon yalnızca Mağaza Performansı
-- sayfasındaki "Anlık Görüntü Al" butonuyla MANUEL tetikleniyordu —
-- otomatik zamanlayıcı yoktu (README'de "elle kurulmalı" olarak not
-- edilmişti). Bu migration pg_cron uzantısını etkinleştirip
-- fonksiyonu her tenant için her gün otomatik çalıştıran bir iş
-- ekliyor; artık elle kurulum gerekmiyor.
-- ============================================================

create extension if not exists pg_cron with schema extensions;

-- cron.schedule aynı isimde bir iş zaten varsa onu oluşturmak yerine
-- günceller (pg_cron'un upsert davranışı), bu yüzden bu migration'ın
-- tekrar çalıştırılması güvenlidir.
select cron.schedule(
  'capture-store-score-snapshots-daily',
  '0 1 * * *', -- her gün 01:00 (UTC)
  $$select capture_store_score_snapshots(t.id) from tenants t$$
);
