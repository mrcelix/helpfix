-- ============================================================
-- HelpFix — 0045_skill_based_assignment.sql
-- Faz BF: Beceri Bazlı Otomatik Atama (1/2).
--
-- ÖNEMLİ: Bu dosyayı çalıştırdıktan sonra
-- 0045b_skill_based_assignment_triggers.sql'i AYRI bir çalıştırma
-- olarak (SQL editöründe "Run" butonuna ikinci kez basarak) uygulayın
-- — Postgres, aynı transaction içinde eklenen bir enum değerinin
-- (assign_by_skill) o transaction içinde hemen kullanılmasına izin
-- vermez (bkz. 0023/0023b'deki aynı kısıtlama).
-- ============================================================

alter type automation_action add value 'assign_by_skill';

-- Teknisyenlerin hangi kategoride (ticket-categories.ts'deki 7 üst
-- düzey kategoriden biriyle, örn. "Ağ & VPN") ne kadar yetkin olduğu.
create table user_skills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  category_label text not null,
  proficiency smallint not null default 3 check (proficiency between 1 and 5),
  created_at timestamptz not null default now()
);

create unique index idx_user_skills_unique on user_skills(tenant_id, user_id, category_label);
create index idx_user_skills_tenant on user_skills(tenant_id);

alter table user_skills enable row level security;

create policy user_skills_select on user_skills
  for select using (
    tenant_id = current_tenant_id()
    and current_user_role() in ('tenant_admin', 'manager', 'agent')
  );

-- Yönetici/admin herkesin becerisini düzenleyebilir; bir kullanıcı
-- kendi becerisini de kendisi güncelleyebilir (öz-bildirim).
create policy user_skills_write on user_skills
  for all using (
    tenant_id = current_tenant_id()
    and (
      current_user_role() in ('tenant_admin', 'manager')
      or user_id = current_profile_id()
    )
  )
  with check (tenant_id = current_tenant_id());
