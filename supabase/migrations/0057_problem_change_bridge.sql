-- ============================================================
-- HelpFix — 0057_problem_change_bridge.sql
-- Faz BT: Problem → Değişiklik köprüsü.
--
-- ITIL yaşam döngüsünün eksik halkası: bir problem "Bilinen Hata"
-- olup kalıcı çözümü bir değişiklik gerektirdiğinde, önceden HİÇBİR
-- resmi bağlantı yoktu. Artık changes.problem_id ile gerçek bir
-- bağlantı var; Problem Drawer'dan tek tıkla önceden doldurulmuş bir
-- Değişiklik taslağı oluşturuluyor ve bağlı değişiklikler Problem
-- Drawer'da görünüyor.
-- ============================================================

alter table changes add column problem_id uuid references problems(id) on delete set null;

create index idx_changes_problem on changes(problem_id);
