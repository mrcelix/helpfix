-- ============================================================
-- HelpFix — 0033_sla_tiers.sql
-- Cila: SLA Yönetimi'ne üç katman — SLA (müşteriyle), OLA (iç
-- ekipler arası), UC (tedarikçi/sağlayıcı ile taahhüt sözleşmesi).
-- ============================================================

create type sla_tier as enum ('sla', 'ola', 'uc');

alter table sla_policies add column tier sla_tier not null default 'sla';
