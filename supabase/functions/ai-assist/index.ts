// supabase/functions/ai-assist/index.ts
//
// Faz AT: Servis Masası'na Claude API ile AI destekli triyaj, özet ve
// yanıt taslağı. Faz AT+1 ile tenant başına AYLIK KULLANIM KOTASI eklendi.
//
// Desteklenen action'lar:
//   'suggest-triage'  — {title, description, existingCategories?}
//                        → {category, priority, reasoning}
//                        Herhangi bir tenant kullanıcısı çağırabilir
//                        (requester dahil — talep oluştururken kullanılır).
//   'summarize'       — {title, description, comments}
//                        → {summary}
//                        Sadece agent/manager/tenant_admin.
//   'draft-reply'     — {title, description, comments, instruction?}
//                        → {draft}
//                        Sadece agent/manager/tenant_admin.
//   'weekly-digest'   — {} (Faz 3)
//                        → {digest}
//                        Sadece manager/tenant_admin. Son 7 günün ITSM
//                        verilerini (hacim, SLA, AI benimseme, top
//                        kategoriler) toplayıp Türkçe yönetici özeti üretir.
//
// KOTA: Her başarılı çağrı öncesi, tenant'ın bu ayki kullanımı
// ai_quota.monthly_limit ile karşılaştırılır. Kota dolmuşsa Claude API
// hiç çağrılmadan net bir hata döner (maliyet oluşmaz). Kota kontrolü
// ve loglama service_role ile yapılır — çünkü bir requester bile
// suggest-triage tetikleyebiliyor ve kullanım günlüğü RLS'te sadece
// admin/manager'a açık (bkz. 0038 migration), dolayısıyla anon+JWT
// istemcisiyle her rol için güvenilir sayım yapılamaz.
//
// DEPLOY: Supabase Dashboard → Edge Functions → "ai-assist" adında yeni
// fonksiyon → bu kodu yapıştır → Deploy. Ardından Edge Functions →
// Secrets bölümüne ANTHROPIC_API_KEY ekle (console.anthropic.com'dan
// alınan API anahtarı). SUPABASE_URL / SUPABASE_ANON_KEY otomatik gelir.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODEL = 'claude-sonnet-4-6'
const DEFAULT_MONTHLY_LIMIT = 500

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Yetkilendirme başlığı eksik')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user: authUser },
    } = await supabaseClient.auth.getUser()
    if (!authUser) throw new Error('Kimlik doğrulanamadı')

    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()
    if (profileError || !profile) throw new Error('Profil bulunamadı')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ---- KOTA KONTROLÜ ----
    const { data: quotaRow } = await supabaseAdmin
      .from('ai_quota')
      .select('monthly_limit')
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()
    const monthlyLimit = quotaRow?.monthly_limit ?? DEFAULT_MONTHLY_LIMIT

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: usedCount } = await supabaseAdmin
      .from('ai_usage_log')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)
      .gte('created_at', startOfMonth.toISOString())

    if ((usedCount ?? 0) >= monthlyLimit) {
      throw new Error(
        `Bu ayki AI kullanım kotanız doldu (${usedCount}/${monthlyLimit}). Yönetici panelinden kota artırılabilir veya gelecek ay otomatik sıfırlanır.`
      )
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY tanımlı değil (Edge Function Secrets\'a eklenmeli)')

    const body = await req.json()
    const { action } = body

    if (action === 'suggest-triage') {
      const { title, description, existingCategories } = body
      if (!title?.trim()) throw new Error('Başlık zorunludur')

      const prompt = `Sen bir BT servis masası (ITSM) triyaj asistanısın. Aşağıdaki talebi oku ve en uygun kategori ile önceliği öner.

Başlık: ${title}
Açıklama: ${description || '(açıklama girilmedi)'}
${existingCategories?.length ? `\nMevcut kategoriler (mümkünse bunlardan birini kullan, aksi halde yeni ve kısa bir kategori öner): ${existingCategories.join(', ')}` : ''}

Öncelik seçenekleri: P1 (kritik, iş durdu), P2 (yüksek, ciddi etki), P3 (orta, normal), P4 (düşük, önemsiz).

SADECE şu JSON formatında yanıt ver, başka hiçbir şey yazma:
{"category": "...", "priority": "P1|P2|P3|P4", "reasoning": "1 cümlelik kısa gerekçe (Türkçe)"}`

      const result = await callClaude(anthropicKey, prompt)
      await logUsage(supabaseAdmin, profile.tenant_id, profile.id, 'suggest-triage')
      return ok(parseJsonResponse(result))
    }

    if (action === 'summarize' || action === 'draft-reply') {
      if (!['tenant_admin', 'manager', 'agent'].includes(profile.role)) {
        throw new Error('Bu işlem sadece ajanlar için kullanılabilir')
      }

      const { title, description, comments } = body
      const thread = (comments as { author: string; body: string; isInternal: boolean }[] | undefined)
        ?.map((c) => `[${c.isInternal ? 'DAHİLİ NOT' : 'YANIT'}] ${c.author}: ${c.body}`)
        .join('\n') || '(henüz yorum yok)'

      if (action === 'summarize') {
        const prompt = `Sen bir BT servis masası ajanına yardımcı olan özet asistanısın. Aşağıdaki talebi ve yorum geçmişini oku, ajanın hızlıca durumu kavraması için 3-4 cümlelik kısa, net bir özet çıkar (Türkçe). Teknik detayları ve şu ana kadar denenenleri vurgula.

Başlık: ${title}
Açıklama: ${description || '(açıklama girilmedi)'}

Yorum geçmişi:
${thread}

SADECE şu JSON formatında yanıt ver: {"summary": "..."}`

        const result = await callClaude(anthropicKey, prompt)
        await logUsage(supabaseAdmin, profile.tenant_id, profile.id, 'summarize')
        return ok(parseJsonResponse(result))
      }

      // draft-reply
      const { instruction } = body
      const prompt = `Sen bir BT servis masası ajanısın. Aşağıdaki talebe, müşteriye gönderilecek kısa, kibar ve profesyonel bir yanıt taslağı yaz (Türkçe). Dahili notları yanıta YANSITMA, onlar sadece bağlam içindir.

Başlık: ${title}
Açıklama: ${description || '(açıklama girilmedi)'}

Yorum geçmişi:
${thread}
${instruction ? `\nAjanın özel isteği: ${instruction}` : ''}

SADECE şu JSON formatında yanıt ver: {"draft": "..."}`

      const result = await callClaude(anthropicKey, prompt)
      await logUsage(supabaseAdmin, profile.tenant_id, profile.id, 'draft-reply')
      return ok(parseJsonResponse(result))
    }

    if (action === 'weekly-digest') {
      if (!['tenant_admin', 'manager'].includes(profile.role)) {
        throw new Error('Bu işlem sadece yöneticiler için kullanılabilir')
      }

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // Son 7 günün verilerini paralel topla (service_role — RLS'ten bağımsız,
      // ama her sorgu tenant_id ile daraltılıyor)
      const [createdRes, resolvedRes, openP1Res, slaRes, aiRes, catRes] = await Promise.all([
        supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true })
          .eq('tenant_id', profile.tenant_id).gte('created_at', since),
        supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true })
          .eq('tenant_id', profile.tenant_id).gte('resolved_at', since),
        supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true })
          .eq('tenant_id', profile.tenant_id).eq('priority', 'P1')
          .in('status', ['new', 'open', 'in_progress', 'on_hold']),
        supabaseAdmin.rpc('get_sla_compliance', { p_tenant_id: profile.tenant_id }),
        supabaseAdmin.rpc('get_ai_adoption_stats', { p_tenant_id: profile.tenant_id, p_days: 7 }),
        supabaseAdmin.from('incidents').select('category')
          .eq('tenant_id', profile.tenant_id).gte('created_at', since)
          .not('category', 'is', null).limit(500),
      ])

      const topCategories = Object.entries(
        (catRes.data ?? []).reduce((acc: Record<string, number>, r: { category: string | null }) => {
          if (r.category) acc[r.category] = (acc[r.category] ?? 0) + 1
          return acc
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat, n]) => `${cat} (${n})`)
        .join(', ') || '(veri yok)'

      const sla = slaRes.data?.[0] ?? slaRes.data
      const ai = aiRes.data?.[0]

      const prompt = `Sen bir BT servis yönetimi (ITSM) platformunun yönetici özeti asistanısın. Aşağıdaki son 7 günlük verilerden, BT yöneticisine e-postayla gönderilebilecek kısa bir Türkçe yönetici özeti yaz.

Kurallar: 4-6 cümle, madde işareti YOK, akıcı paragraf. Önce genel gidişat, sonra dikkat gerektiren nokta (varsa açık P1'ler veya düşük SLA), sonra AI benimseme durumu. Sayıları metne doğal biçimde göm. Abartılı övgü veya panik dili kullanma; veri azsa bunu dürüstçe belirt.

VERİLER (son 7 gün):
- Açılan talep: ${createdRes.count ?? 0}
- Çözülen talep: ${resolvedRes.count ?? 0}
- Şu an açık P1 (kritik) sayısı: ${openP1Res.count ?? 0}
- SLA uyumluluğu (30 gün): %${sla?.compliance_percent ?? 'bilinmiyor'}
- En çok talep gelen kategoriler: ${topCategories}
- AI triyaj çalıştırma: ${ai?.triage_runs ?? 0}, isabet oranı: ${ai?.accept_rate != null ? '%' + ai.accept_rate : 'henüz veri yok'}
- AI asistan deflection: ${ai?.deflection_rate != null ? '%' + ai.deflection_rate : 'henüz veri yok'} (${ai?.chat_deflected ?? 0} sorun talep açılmadan çözüldü)
- AI özet/taslak kullanımı: ${(ai?.summary_runs ?? 0) + (ai?.draft_runs ?? 0)}

SADECE şu JSON formatında yanıt ver: {"digest": "..."}`

      const result = await callClaude(anthropicKey, prompt)
      await logUsage(supabaseAdmin, profile.tenant_id, profile.id, 'weekly-digest')
      return ok(parseJsonResponse(result))
    }

    throw new Error(`Bilinmeyen action: ${action}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

async function callClaude(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Claude API hatası (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const textBlock = data.content?.find((b: { type: string }) => b.type === 'text')
  if (!textBlock?.text) throw new Error('Claude yanıtı boş döndü')
  return textBlock.text as string
}

function parseJsonResponse(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Claude yanıtı geçerli JSON değildi')
  }
}

async function logUsage(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  tenantId: string,
  userId: string,
  action: string
) {
  // Loglama başarısız olsa bile ana yanıtı bozmasın diye hatayı yutuyoruz
  // (kullanıcı deneyimi > mükemmel sayaç doğruluğu). Kalıcı hata olursa
  // Supabase Edge Function logs'ta görünür.
  const { error } = await supabaseAdmin.from('ai_usage_log').insert({ tenant_id: tenantId, user_id: userId, action })
  if (error) console.error('ai_usage_log insert hatası:', error.message)
}

function ok(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}
