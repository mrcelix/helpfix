-- ============================================================
-- HelpFix — 0017_decision_trees.sql
-- Cila: Bilgi Yönetimi'ne Rehberli Karar Ağaçları. Ayrı normalize
-- tablolar yerine jsonb kullanıyoruz — ağaç yapısı doğası gereği
-- iç içe ve makale bazlı, ayrı sorgu gerektirmiyor.
--
-- Şema: { "startNode": "n1", "nodes": { "n1": { "text": "...",
--   "options": [{ "label": "Evet", "next": "n2" }, ...] } } }
-- options boş dizi ise o düğüm bir çözüm/bitiş noktasıdır.
-- ============================================================

alter table knowledge_articles add column decision_tree jsonb;
