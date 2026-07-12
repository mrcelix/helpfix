-- ============================================================
-- HelpFix — seed_assign_deneme_user_to_store.sql
-- Tek seferlik: deneme@deneme.com kullanıcısını Bakırköy Mağazası'na
-- atar (seed_store_performance_demo.sql'de oluşturulan mağaza).
-- Çalışan Merkezi > "Mağazam" sayfasını test etmek için.
-- ============================================================

do $$
declare
  v_user_id uuid;
  v_site_id uuid;
begin
  select id into v_user_id from user_profiles where email = 'deneme@deneme.com' limit 1;
  if v_user_id is null then
    raise exception 'deneme@deneme.com adresine sahip kullanıcı bulunamadı.';
  end if;

  select id into v_site_id from sites where name = 'Bakırköy Mağazası' limit 1;
  if v_site_id is null then
    raise exception 'Bakırköy Mağazası bulunamadı — önce seed_store_performance_demo.sql çalıştırılmış olmalı.';
  end if;

  update user_profiles set site_id = v_site_id where id = v_user_id;

  raise notice 'deneme@deneme.com → Bakırköy Mağazası olarak atandı.';
end $$;
