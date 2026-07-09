// supabase/functions/ai-assist/index.ts
//
// Faz AT: Servis Masası'na Claude API ile AI destekli triyaj, özet ve
// yanıt taslağı. Bu fonksiyon veritabanına service_role ile ASLA
// dokunmaz — sadece çağıranın kimliğini + rolünü doğrular ve
// frontend'in gönderdiği metni Anthropic API'ye iletir.
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

function ok(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}
