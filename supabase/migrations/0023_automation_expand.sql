-- ============================================================
-- HelpFix — 0023_automation_expand.sql
-- Cila: AI Otomasyon motorunu genişletme (1/2) — yeni tetikleyici
-- türlerini enum'a ekler. NOT: Bu dosyayı çalıştırdıktan sonra
-- 0023b_automation_expand_triggers.sql'i AYRI bir çalıştırma olarak
-- (Run butonuna ikinci kez basarak) uygulayın — Postgres, aynı
-- transaction içinde eklenen bir enum değerinin hemen kullanılmasına
-- izin vermez.
-- ============================================================

alter type automation_trigger add value 'problem_created';
alter type automation_trigger add value 'change_created';
