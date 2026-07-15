-- ============================================================================
-- 0063 — Tenant marka renkleri (Görünüm / Tema ayarları)
--
-- Amaç: Her tenant'ın logosuna uygun bir "varsayılan" marka teması olsun.
--   * theme_preset: 'kurumsal' | 'fenerbahce' | 'galatasaray' | 'besiktas'
--     | 'trabzonspor' | 'custom'  (index.css / ThemeContext ile birebir)
--   * custom seçilirse brand_color / brand_deep / accent_color kullanılır
--     (logoya göre elle ayarlanan hex renkleri).
--
-- Okuma: tenants zaten "id = current_tenant_id()" RLS select politikasına
--   sahip (0001) — giriş yapan kullanıcı kendi tenant'ının markasını okuyabilir.
-- Yazma: sadece tenant_admin. Tüm tenants tablosunu istemciye açmamak için
--   branding güncellemesi set_tenant_branding() RPC'si üzerinden yapılır
--   (security definer + rol kontrolü).
-- ============================================================================

alter table tenants
  add column if not exists theme_preset text not null default 'kurumsal'
    check (theme_preset in (
      'kurumsal', 'fenerbahce', 'galatasaray', 'besiktas', 'trabzonspor', 'custom'
    )),
  add column if not exists brand_color text,   -- Marka Rengi      (custom modda)
  add column if not exists brand_deep  text,   -- Koyu Marka Rengi (custom modda)
  add column if not exists accent_color text;  -- Vurgu Rengi      (custom modda)

-- ---------------------------------------------------------------------------
-- Yazma: sadece tenant_admin, sadece kendi tenant'ının branding'i.
-- current_user_role() / current_tenant_id() 0001'deki yardımcılardan gelir.
-- ---------------------------------------------------------------------------
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
  if current_user_role() <> 'tenant_admin' then
    raise exception 'Bu işlem için tenant_admin yetkisi gerekir';
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
