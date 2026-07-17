-- ============================================================================
-- 0068 — device_status_events'i Realtime yayınına ekle
--
-- Faz MP-2/MP-3'te eklenen useDeviceStatusRealtime (Hatlar & Cihazlar,
-- Envanter SLA, Mağazam sekmeleri), device_status_events tablosuna
-- postgres_changes ile subscribe oluyor. Ama bu ÖNCEKİ hiçbir migration
-- device_status_events'i (ya da başka bir tabloyu) supabase_realtime
-- yayınına eklemedi — proje muhtemelen Dashboard üzerinden manuel
-- yapılandırılmış olabilir, ama koddan/migration geçmişinden bu garanti
-- edilemiyor. Yayına eklenmemiş bir tabloda subscribe HİÇBİR HATA
-- VERMEDEN sessizce hiçbir olay almaz — yani "Realtime nokta" özelliği
-- görünüşte çalışıyor ama aslında hiç güncellenmiyor olabilir.
--
-- Idempotent: tablo zaten yayında ise tekrar eklemeyi dener ve hata
-- vermeden atlar (pg_publication_tables kontrolü).
-- ============================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'device_status_events'
     )
  then
    alter publication supabase_realtime add table device_status_events;
  end if;
end $$;
