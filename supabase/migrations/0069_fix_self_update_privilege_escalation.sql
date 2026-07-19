-- ============================================================
-- HelpFix — 0069_fix_self_update_privilege_escalation.sql
--
-- KRİTİK GÜVENLİK DÜZELTMESİ
--
-- user_profiles_update_self politikası (0001_init.sql) sadece satır
-- SAHİPLİĞİNİ kontrol ediyordu ("auth_user_id = auth.uid()"), hangi
-- SÜTUNLARIN değiştirilebileceğini kısıtlamıyordu. Bu, herhangi bir
-- oturum açmış kullanıcının (requester dahil, uygulamanın en düşük
-- yetkili rolü) doğrudan REST API üzerinden kendi user_profiles
-- satırını güncelleyip:
--   - role'ünü 'tenant_admin' yapmasına (tam ayrıcalık yükseltmesi),
--   - is_active'i true yapıp kapatılmış bir hesabı yeniden
--     aktifleştirmesine,
--   - tenant_id/site_id/department_id'sini değiştirip başka bir
--     tenant'ın/departmanın veri kapsamına atlamasına
-- izin veriyordu. Uygulama tarafında (AdminPage.tsx) eklenen "kendi
-- rolünü değiştiremezsin" koruması sadece UI seviyesindeydi ve
-- tarayıcı devtools/curl ile trivially atlanabiliyordu.
--
-- Bu migration, tenant_admin OLMAYAN bir kullanıcı kendi satırını
-- güncellerken hassas sütunları (role/tenant_id/is_active/site_id/
-- department_id) değiştirmeye çalışırsa işlemi reddeden bir BEFORE
-- UPDATE trigger ekler. tenant_admin'ler (kendi satırlarını veya
-- user_profiles_admin_write politikası üzerinden başkalarının
-- satırlarını) etkilenmeden değiştirmeye devam edebilir.
-- ============================================================

create or replace function prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- current_user_role(), bu update transaction'ı içinde ÇAĞIRANIN
  -- (auth.uid()) satırındaki role'ü okur; bu satır henüz commit
  -- edilmediğinden (BEFORE UPDATE), değişmekte olan role DEĞİL,
  -- işlemden önceki gerçek role döner.
  if current_user_role() = 'tenant_admin' then
    return new;
  end if;

  if new.role is distinct from old.role
    or new.tenant_id is distinct from old.tenant_id
    or new.is_active is distinct from old.is_active
    or new.site_id is distinct from old.site_id
    or new.department_id is distinct from old.department_id
  then
    raise exception 'Bu alanları değiştirme yetkiniz yok. / You are not authorized to change these fields.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_self_privilege_escalation on user_profiles;
create trigger trg_prevent_self_privilege_escalation
  before update on user_profiles
  for each row execute function prevent_self_privilege_escalation();
