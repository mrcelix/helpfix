// supabase/functions/store-health-integration/index.ts
//
// Faz BN: Mağaza IT Sağlığı Skoru — GELİŞMİŞ ENTEGRASYON webhook'u.
//
// Dış ESL / Kiosk-Mobil Kasa / Network izleme sistemleri, kendi
// mağazalarına özel bir token ile bu endpoint'e POST atarak cihaz
// durumu ve operasyonel olay (geç açılma vb.) bildirebilir. Kullanıcı
// oturumu GEREKTİRMEZ — her site'ın kendi benzersiz integration_token'ı
// (Admin Panel > Siteler'den görüntülenir) buradaki tek yetkilendirmedir.
//
// service_role kullanır çünkü çağıran taraf bir HelpFix kullanıcısı
// değil, dış bir sistemdir (JWT yok).
//
// --- 1) Cihaz durumu bildirimi ---
// POST /store-health-integration?token=<site.integration_token>
// {
//   "type": "device_status",
//   "device_tag": "ESL-000123",
//   "is_online": false,
//   "occurred_at": "2026-07-10T09:15:00Z"
// }
// Etiketi eşleşen cihaz o tenant'ta bulunamazsa 404 döner. Cihazın
// site_id'si boşsa otomatik olarak bu token'ın sitesine atanır.
//
// --- 2) Operasyonel olay bildirimi (örn. geç açılma) ---
// POST /store-health-integration?token=<site.integration_token>
// {
//   "type": "operational_event",
//   "event_type": "late_opening",
//   "note": "Açılış 42 dakika gecikti",
//   "occurred_at": "2026-07-10T08:42:00Z"
// }
//
// DEPLOY: Supabase Dashboard → Edge Functions → "store-health-integration"
// → bu kodu yapıştır → Deploy. Ek bir secret gerekmez.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    if (!token) return json({ error: "'token' parametresi eksik" }, 401)

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, tenant_id, name')
      .eq('integration_token', token)
      .maybeSingle()

    if (siteError) throw siteError
    if (!site) return json({ error: 'Geçersiz entegrasyon token\'ı' }, 401)

    const body = await req.json()
    const { type } = body

    if (type === 'device_status') {
      const { device_tag, is_online, occurred_at } = body
      if (!device_tag || typeof is_online !== 'boolean') {
        return json({ error: "'device_tag' ve 'is_online' (boolean) zorunlu" }, 400)
      }

      const { data: ci, error: ciError } = await supabaseAdmin
        .from('configuration_items')
        .select('id, site_id')
        .eq('tenant_id', site.tenant_id)
        .eq('tag', device_tag)
        .maybeSingle()

      if (ciError) throw ciError
      if (!ci) return json({ error: `'${device_tag}' etiketli cihaz bulunamadı` }, 404)

      const patch: Record<string, unknown> = {
        is_online,
        last_seen_at: occurred_at ?? new Date().toISOString(),
      }
      if (!ci.site_id) patch.site_id = site.id

      const { error: updateError } = await supabaseAdmin.from('configuration_items').update(patch).eq('id', ci.id)
      if (updateError) throw updateError

      return json({ received: true, action: 'device_status_updated', ci_id: ci.id })
    }

    if (type === 'operational_event') {
      const { event_type, note, occurred_at } = body
      if (!event_type || !['late_opening', 'recurring_fault', 'other'].includes(event_type)) {
        return json({ error: "'event_type' geçersiz (late_opening | recurring_fault | other olmalı)" }, 400)
      }

      const { error: insertError } = await supabaseAdmin.from('store_operational_events').insert({
        tenant_id: site.tenant_id,
        site_id: site.id,
        event_type,
        note: note ?? null,
        occurred_at: occurred_at ?? new Date().toISOString(),
        source: 'integration',
      })
      if (insertError) throw insertError

      return json({ received: true, action: 'operational_event_logged', site: site.name })
    }

    return json({ error: `Bilinmeyen 'type': ${type}` }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return json({ error: message }, 500)
  }
})

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
