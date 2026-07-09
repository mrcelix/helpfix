// supabase/functions/inbound-email/index.ts
//
// Faz AZ: Gerçek Omnichannel — e-posta → otomatik talep.
//
// Bu fonksiyon bir e-posta sağlayıcısının (Postmark, Resend, Mailgun vb.)
// "inbound parse" webhook'unu karşılar. Kullanıcı JWT'si YOKTUR (e-posta
// sağlayıcısı çağırıyor, oturum açmış bir kişi değil) — bu yüzden:
//   1) Public bir endpoint'tir, ama ?secret= parametresiyle korunur.
//   2) Veritabanı işlemleri için service_role KULLANMAK ZORUNDADIR.
//
// BEKLENEN PAYLOAD (Postmark inbound formatına yakın; farklı sağlayıcı
// kullanılıyorsa alan adlarını buna göre eşleyin):
// {
//   "From": "ali@musteri.com",
//   "FromName": "Ali Veli",
//   "To": "acme@tickets.helpfix.app",
//   "Subject": "Yazıcım çalışmıyor",
//   "TextBody": "Merhaba, ofisteki yazıcı...",
//   "MessageID": "<abc123@mail.musteri.com>",
//   "Headers": [{ "Name": "In-Reply-To", "Value": "<xyz@tickets...>" }, ...]
// }
//
// DEPLOY:
//  1) Supabase Dashboard → Edge Functions → "inbound-email" → bu kodu yapıştır → Deploy.
//  2) Edge Functions → Secrets → INBOUND_EMAIL_SECRET adında rastgele
//     uzun bir gizli anahtar ekle.
//  3) E-posta sağlayıcınızda inbound webhook URL'sini şu şekilde tanımlayın:
//     https://<proje-ref>.supabase.co/functions/v1/inbound-email?secret=<INBOUND_EMAIL_SECRET>
//  4) Sağlayıcı panelinde, ilgili tenant'ın gelen kutusu adresini
//     (Admin Panel → E-posta Ayarları'nda görünür) alan adınıza yönlendirin.
//
// SINIRLAMA: Supabase Auth e-posta adresleri PROJE GENELİNDE benzersizdir.
// Aynı e-posta adresi daha önce BAŞKA bir tenant'ta kullanıcıysa, bu
// fonksiyon o adres için yeni tenant'ta otomatik profil oluşturamaz ve
// açıklayıcı bir hata döner (nadir bir durum, çok-tenant'lı ortak
// müşteri senaryosu).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*' }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const secret = url.searchParams.get('secret')
    const expectedSecret = Deno.env.get('INBOUND_EMAIL_SECRET')
    if (!expectedSecret || secret !== expectedSecret) {
      return json({ error: 'Yetkisiz' }, 401)
    }

    const payload = await req.json()
    const fromEmail = extractEmail(payload.From ?? payload.from)
    const fromName = payload.FromName ?? payload.fromName ?? fromEmail
    const toAddress = extractEmail(payload.To ?? payload.to ?? payload.OriginalRecipient)
    const subject: string = payload.Subject ?? payload.subject ?? '(Konu belirtilmedi)'
    const textBody: string = payload.TextBody ?? payload.text ?? payload.stripped_text ?? ''
    const messageId: string | null = payload.MessageID ?? payload.messageId ?? null
    const inReplyTo: string | null = findHeader(payload, 'In-Reply-To') ?? findHeader(payload, 'References')

    if (!fromEmail || !toAddress) {
      return json({ error: 'From/To alanları çözümlenemedi' }, 400)
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // ---- 1) Alıcı adresinden tenant'ı bul ----
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('inbound_email', toAddress.toLowerCase())
      .maybeSingle()

    if (tenantError) throw tenantError
    if (!tenant) {
      // Sağlayıcı yeniden denemesin diye 200 dönüyoruz, sadece logluyoruz.
      console.error(`Tenant bulunamadı: ${toAddress}`)
      return json({ received: true, routed: false })
    }

    // ---- 2) Bu bir thread yanıtı mı? (In-Reply-To eşleşirse yorum ekle) ----
    if (inReplyTo) {
      const { data: existingIncident } = await supabaseAdmin
        .from('incidents')
        .select('id, tenant_id')
        .eq('email_message_id', normalizeMessageId(inReplyTo))
        .eq('tenant_id', tenant.id)
        .maybeSingle()

      if (existingIncident) {
        const requesterProfile = await findOrCreateRequester(supabaseAdmin, tenant.id, fromEmail, fromName)
        if ('error' in requesterProfile) return json({ error: requesterProfile.error }, 409)

        const { error: commentError } = await supabaseAdmin.from('incident_comments').insert({
          incident_id: existingIncident.id,
          author_id: requesterProfile.id,
          body: textBody || '(boş e-posta içeriği)',
          is_internal: false,
        })
        if (commentError) throw commentError

        return json({ received: true, routed: true, action: 'comment_added', incident_id: existingIncident.id })
      }
    }

    // ---- 3) Yeni talep oluştur ----
    const requesterProfile = await findOrCreateRequester(supabaseAdmin, tenant.id, fromEmail, fromName)
    if ('error' in requesterProfile) return json({ error: requesterProfile.error }, 409)

    const { data: incident, error: insertError } = await supabaseAdmin
      .from('incidents')
      .insert({
        tenant_id: tenant.id,
        title: subject,
        description: textBody || '(boş e-posta içeriği)',
        channel: 'email',
        priority: 'P3',
        status: 'new',
        requester_id: requesterProfile.id,
        email_message_id: messageId ? normalizeMessageId(messageId) : null,
      })
      .select('id, ref')
      .single()

    if (insertError) throw insertError

    return json({ received: true, routed: true, action: 'incident_created', incident_id: incident.id, ref: incident.ref })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    console.error('inbound-email hatası:', message)
    return json({ error: message }, 500)
  }
})

// --------------------------------------------------------------
// YARDIMCI FONKSİYONLAR
// --------------------------------------------------------------

function extractEmail(raw: string | undefined): string | null {
  if (!raw) return null
  const match = raw.match(/[^\s<@]+@[^\s>]+/)
  return match ? match[0].toLowerCase() : raw.toLowerCase()
}

function normalizeMessageId(id: string): string {
  return id.trim().replace(/^<|>$/g, '')
}

function findHeader(payload: Record<string, unknown>, name: string): string | null {
  const headers = payload.Headers as { Name?: string; Value?: string }[] | undefined
  const found = headers?.find((h) => h.Name?.toLowerCase() === name.toLowerCase())
  return found?.Value ? normalizeMessageId(found.Value) : null
}

/** Tenant içinde e-postaya göre requester profili bulur; yoksa hem bir
 * Auth kullanıcısı hem de user_profiles satırı oluşturur (email-only
 * dış gönderenler için — panel şifresiyle giriş yapmaları beklenmez,
 * ama ileride "şifremi unuttum" ile giriş açabilirler). */
async function findOrCreateRequester(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  tenantId: string,
  email: string,
  fullName: string
): Promise<{ id: string } | { error: string }> {
  const { data: existingProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', email)
    .maybeSingle()
  if (existingProfile) return { id: existingProfile.id }

  // Auth kullanıcısı oluşturmayı dene.
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: crypto.randomUUID(),
  })

  let authUserId: string
  if (createError) {
    // E-posta proje genelinde zaten kayıtlıysa (başka bir tenant'ta veya
    // agent hesabı olarak), o kullanıcıyı bul.
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) return { error: `Auth kullanıcısı oluşturulamadı ve mevcut kullanıcı aranamadı: ${createError.message}` }
    const match = list.users.find((u: { email?: string }) => u.email?.toLowerCase() === email)
    if (!match) return { error: `Auth kullanıcısı oluşturulamadı: ${createError.message}` }
    authUserId = match.id

    // Bu auth kullanıcısının BAŞKA bir tenant'ta profili var mı kontrol et
    // — varsa bu tenant'ta otomatik profil oluşturamayız (bkz. dosya başı NOT).
    const { data: crossTenantProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, tenant_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
    if (crossTenantProfile && crossTenantProfile.tenant_id !== tenantId) {
      return { error: `${email} adresi zaten başka bir tenant'ta kayıtlı; bu tenant için otomatik profil açılamadı.` }
    }
    if (crossTenantProfile) return { id: crossTenantProfile.id }
  } else {
    authUserId = created.user.id
  }

  const { data: newProfile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      tenant_id: tenantId,
      auth_user_id: authUserId,
      full_name: fullName || email,
      email,
      role: 'requester',
    })
    .select('id')
    .single()
  if (profileError) return { error: profileError.message }

  return { id: newProfile.id }
}

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
