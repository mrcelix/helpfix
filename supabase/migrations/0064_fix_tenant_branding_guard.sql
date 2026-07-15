-- ============================================================================
-- 0064 — 0063'teki set_tenant_branding rol kontrolünün düzeltilmesi
--
-- Hata: 0063'te guard "current_user_role() <> 'tenant_admin'" şeklindeydi.
-- Profili olmayan bir çağrıda (ör. anon) current_user_role() NULL döner ve
-- "NULL <> 'tenant_admin'" sonucu NULL olur — bu TRUE olmadığı için RAISE
-- hiç çalışmaz, yani guard sessizce baypas edilir.
--
-- Pratikte veri sızmıyordu (guard geçilse bile update'in WHERE'i
-- "id = current_tenant_id()" ve o da NULL olduğu için hiçbir satır
-- güncellenmiyordu), ama korumanın NULL semantiğine bel bağlaması yanlış.
-- "is distinct from" NULL'ı da doğru şekilde "eşit değil" sayar.
-- ============================================================================

create or replace function set_tenant_branding(
  p_theme_preset text,
  p_brand_color  text default null,
  p_brand_deep   text default null,
  p_accent_color text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- NULL-güvenli rol kontrolü: profilsiz/anon çağrılar da reddedilir.
  if current_user_role() is distinct from 'tenant_admin' then
    raise exception 'Bu işlem için tenant_admin yetkisi gerekir';
  end if;

  -- Tenant bağlamı yoksa hiçbir şey güncelleme (savunma katmanı).
  if current_tenant_id() is null then
    raise exception 'Tenant bağlamı bulunamadı';
  end if;

  if p_theme_preset not in (
    'kurumsal', 'fenerbahce', 'galatasaray', 'besiktas', 'trabzonspor', 'custom'
  ) then
    raise exception 'Geçersiz tema: %', p_theme_preset;
  end if;

  update tenants
     set theme_preset = p_theme_preset,
         brand_color  = p_brand_color,
         brand_deep   = p_brand_deep,
         accent_color = p_accent_color
   where id = current_tenant_id();
end;
$$;

grant execute on function set_tenant_branding(text, text, text, text) to authenticated;
