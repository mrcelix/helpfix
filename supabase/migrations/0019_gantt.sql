-- ============================================================
-- HelpFix — 0019_gantt.sql
-- Cila: Proje Yönetimi'ne Gantt Şeması. project_tasks'a start_date
-- ekliyoruz (due_date zaten vardı) — bir görevin gerçek bir zaman
-- aralığı olması için gerekli.
-- ============================================================

alter table project_tasks add column start_date date;
