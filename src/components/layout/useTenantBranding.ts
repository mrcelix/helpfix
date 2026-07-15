// Tenant marka teması (0063) — okuma senkronu + admin kaydetme.
//
// useTenantBrandingSync: giriş yapan kullanıcının tenant'ının varsayılan
//   markasını DB'den okur ve ThemeContext.applyTenantBranding ile uygular
//   (yalnızca kullanıcının kişisel override'ı yoksa geçerli olur).
// useSaveTenantBranding: tenant_admin'in seçtiği temayı tüm tenant için
//   varsayılan yapar — set_tenant_branding RPC'si (rol kontrolü sunucuda).

import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme, type TeamTheme } from '@/contexts/ThemeContext'

export function useTenantBrandingSync() {
  const { profile } = useAuth()
  const { applyTenantBranding } = useTheme()
  const tenantId = profile?.tenantId

  useEffect(() => {
    if (!tenantId) return
    let cancelled = false
    supabase
      .from('tenants')
      .select('theme_preset, brand_color, brand_deep, accent_color')
      .eq('id', tenantId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        applyTenantBranding({
          preset: data.theme_preset,
          brand: data.brand_color,
          brandDeep: data.brand_deep,
          accent: data.accent_color,
        })
      })
    return () => {
      cancelled = true
    }
    // applyTenantBranding referansı her render değişebildiği için bilinçli
    // olarak sadece tenantId'ye bağlıyız — tenant başına bir kez çalışır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])
}

export interface SaveBrandingInput {
  preset: TeamTheme
  brand: string | null
  brandDeep: string | null
  accent: string | null
}

export function useSaveTenantBranding() {
  return useMutation({
    mutationFn: async (b: SaveBrandingInput) => {
      const { error } = await supabase.rpc('set_tenant_branding', {
        p_theme_preset: b.preset,
        p_brand_color: b.brand,
        p_brand_deep: b.brandDeep,
        p_accent_color: b.accent,
      })
      if (error) throw error
    },
  })
}
