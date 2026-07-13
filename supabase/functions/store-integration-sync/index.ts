// supabase/functions/store-integration-sync/index.ts
//
// Faz CA: Mağaza Performansı — Entegrasyon Senkronizasyonu.
//
// Admin Panel > Mağaza Performansı > Entegrasyonlar'da tanımlanan
// JSON/WebAPI uç noktalarını çağırıp mağazadaki varlıkların (ESL,
// Kiosk, Network cihazları vb.) canlı durumunu çeker, configuration_
// items.is_online'ı günceller (bu, mevcut trigger sayesinde otomatik
// olarak device_status_events'e de yazılır — Faz BN ile aynı altyapı)
// ve HER ÇALIŞTIRMAYI integration_logs'a servis logu / hata kaydı
// olarak yazar.
//
// --- İKİ ÇAĞRI MODU ---
//
// 1) MANUEL (Admin Panel'deki "Şimdi Senkronize Et" butonu):
//    Kullanıcının kendi JWT'siyle çağrılır. Sadece o kullanıcının
//    tenant_admin/manager olduğu tenant'a ait uç noktaları senkronize
//    eder. Body: { "endpointId": "..." } (tek uç nokta) ya da boş
//    body (tenant'taki tüm aktif uç noktalar).
//
// 2) ZAMANLANMIŞ (Supabase Cron / Scheduled Trigger):
//    Kullanıcı JWT'si olmadan (service_role ile) çağrılır. TÜM
//    tenant'lardaki, zamanı gelmiş (poll_interval_minutes'e göre)
//    aktif uç noktaları tarar ve senkronize eder.
//
// DEPLOY: Supabase Dashboard → Edge Functions → "store-integration-sync"
// → bu kodu yapıştır → Deploy.
//
// ZAMANLAMA KURULUMU (opsiyonel ama önerilir): Supabase Dashboard →
// Edge Functions → store-integration-sync → "Cron" / "Scheduled
// Triggers" sekmesinden örn. "*/5 * * * *" (5 dakikada bir) ekleyin.
// Bu adım panelden yapılır, buradan otomatikleştirilemez.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EndpointRow {
  id: string
  tenant_id: string
  site_id: string
  endpoint_url: string
  http_method: string
  auth_header_name: string | null
  auth_header_value: string | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    let body: { endpointId?: string } = {}
    try {
      body = await req.json()
    } catch {
      // boş body — sorun değil, tüm uygun uç noktalar taranır
    }

    let callerTenantId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      })
      const {
        data: { user },
      } = await supabaseClient.auth.getUser()
      if (user) {
        const { data: profile } = await supabaseClient.from('user_profiles').select('tenant_id, role').eq('auth_user_id', user.id).single()
        if (profile && ['tenant_admin', 'manager'].includes(profile.role)) {
          callerTenantId = profile.tenant_id
        }
      }
    }

    let query = supabaseAdmin
      .from('integration_endpoints')
      .select('id, tenant_id, site_id, endpoint_url, http_method, auth_header_name, auth_header_value, poll_interval_minutes, last_synced_at')
      .eq('is_active', true)

    if (body.endpointId) {
      query = query.eq('id', body.endpointId)
    } else if (callerTenantId) {
      query = query.eq('tenant_id', callerTenantId)
    }

    const { data: endpoints, error: fetchError } = await query
    if (fetchError) throw fetchError

    const now = Date.now()
    const due = (endpoints ?? []).filter((e) => {
      if (body.endpointId || callerTenantId) return true
      if (!e.last_synced_at) return true
      const elapsedMin = (now - new Date(e.last_synced_at).getTime()) / 60000
      return elapsedMin >= e.poll_interval_minutes
    })

    const results = []
    for (const ep of due as EndpointRow[]) {
      results.push(await syncOne(supabaseAdmin, ep))
    }

    return json({ synced: results.length, results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return json({ error: message }, 500)
  }
})

async function syncOne(supabaseAdmin: ReturnType<typeof createClient>, ep: EndpointRow) {
  const start = performance.now()
  let status: 'success' | 'error' | 'partial' = 'success'
  let httpStatus: number | null = null
  let devicesUpdated = 0
  let message = ''

  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (ep.auth_header_name && ep.auth_header_value) headers[ep.auth_header_name] = ep.auth_header_value

    const res = await fetch(ep.endpoint_url, { method: ep.http_method || 'GET', headers })
    httpStatus = res.status

    if (!res.ok) {
      status = 'error'
      message = `HTTP ${res.status} ${res.statusText}`
    } else {
      const payload = await res.json()
      const devices: { tag?: string; online?: boolean }[] = Array.isArray(payload?.devices) ? payload.devices : []
      let failedCount = 0

      for (const d of devices) {
        if (!d.tag || typeof d.online !== 'boolean') {
          failedCount++
          continue
        }
        const { data: ci } = await supabaseAdmin
          .from('configuration_items')
          .select('id')
          .eq('tenant_id', ep.tenant_id)
          .eq('tag', d.tag)
          .maybeSingle()

        if (!ci) {
          failedCount++
          continue
        }
        const { error: updateError } = await supabaseAdmin
          .from('configuration_items')
          .update({ is_online: d.online, last_seen_at: new Date().toISOString() })
          .eq('id', ci.id)
        if (updateError) {
          failedCount++
        } else {
          devicesUpdated++
        }
      }

      if (devices.length === 0) {
        status = 'partial'
        message = "Yanıtta 'devices' dizisi bulunamadı ya da boş."
      } else if (failedCount > 0) {
        status = 'partial'
        message = `${devicesUpdated} cihaz güncellendi, ${failedCount} cihaz eşleştirilemedi/güncellenemedi.`
      } else {
        message = `${devicesUpdated} cihaz başarıyla güncellendi.`
      }
    }
  } catch (err) {
    status = 'error'
    message = err instanceof Error ? err.message : 'Bilinmeyen ağ hatası'
  }

  const durationMs = Math.round(performance.now() - start)

  await supabaseAdmin.from('integration_logs').insert({
    tenant_id: ep.tenant_id,
    endpoint_id: ep.id,
    status,
    http_status: httpStatus,
    duration_ms: durationMs,
    devices_updated: devicesUpdated,
    message,
  })

  await supabaseAdmin
    .from('integration_endpoints')
    .update({ last_synced_at: new Date().toISOString(), last_status: status })
    .eq('id', ep.id)

  return { endpointId: ep.id, status, devicesUpdated, message, durationMs }
}

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
