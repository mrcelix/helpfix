// supabase/functions/ai-chat/index.ts
//
// Faz BK: Konuşma Tabanlı AI Asistan — requester'ların çok turlu
// sohbet edip Bilgi Bankası'ndan yanıt alabildiği, çözülemezse tek
// tıkla gerçek bir Servis Masası talebi açabilen asistan.
//
// Mevcut ai-assist fonksiyonundan farkı: o tek seferlik (triyaj/özet/
// taslak), bu ise geçmişi korunan GERÇEK bir sohbet — Anthropic'in
// tool-use özelliğiyle, model gerektiğinde "create_ticket" aracını
// çağırıp gerçek bir talep açabiliyor.
//
// Bu fonksiyon service_role KULLANMAZ — chat_conversations/messages ve
// incidents tabloları zaten çağıranın KENDİ satırlarına yazma izni
// veriyor (RLS). Sadece AI kullanım kotası kontrolü/loglaması için
// service_role gerekiyor (ai-assist ile aynı desen, bkz. 0038).
//
// DEPLOY: Supabase Dashboard → Edge Functions → "ai-chat" → bu kodu
// yapıştır → Deploy. ANTHROPIC_API_KEY secret'ı ai-assist ile paylaşılır
// (zaten ekliyse tekrar eklemene gerek yok).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODEL = 'claude-sonnet-4-6'
const DEFAULT_MONTHLY_LIMIT = 500

const CREATE_TICKET_TOOL = {
  name: 'create_ticket',
  description:
    'Kullanıcının sorununu Servis Masası\'na gerçek bir talep olarak açar. SADECE şu durumlarda kullan: (a) sorunu kendin çözemedin VE (b) kullanıcı bir talep açılmasını istedi ya da açıkça kabul etti. Asla kullanıcıya sormadan talep açma.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Kısa, net bir talep başlığı (Türkçe)' },
      description: { type: 'string', description: 'Sohbetten derlenen, ajanın anlayacağı ayrıntılı açıklama' },
      category: {
        type: 'string',
        description: 'En uygun kategori: Donanım, Ağ & VPN, Yazılım, Hesap & Erişim, E-posta & İletişim, Güvenlik, Diğer',
      },
      priority: { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'], description: 'P1=Kritik, P2=Acil, P3=Normal, P4=Düşük' },
    },
    required: ['title', 'description', 'category', 'priority'],
  },
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Yetkilendirme başlığı eksik')

    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user: authUser },
    } = await supabaseClient.auth.getUser()
    if (!authUser) throw new Error('Kimlik doğrulanamadı')

    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('id, tenant_id, full_name')
      .eq('auth_user_id', authUser.id)
      .single()
    if (profileError || !profile) throw new Error('Profil bulunamadı')

    const body = await req.json()
    const { conversationId, message } = body
    if (!message?.trim()) throw new Error('Mesaj boş olamaz')

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // ---- KOTA KONTROLÜ (ai-assist ile aynı desen) ----
    const { data: quotaRow } = await supabaseAdmin.from('ai_quota').select('monthly_limit').eq('tenant_id', profile.tenant_id).maybeSingle()
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
      throw new Error(`Bu ayki AI kullanım kotanız doldu (${usedCount}/${monthlyLimit}).`)
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY tanımlı değil')

    // ---- Sohbeti bul ya da oluştur (kendi RLS'imizle — anon+JWT client) ----
    let convoId = conversationId
    if (!convoId) {
      const { data: newConvo, error: convoError } = await supabaseClient
        .from('chat_conversations')
        .insert({ tenant_id: profile.tenant_id, user_id: profile.id, title: message.trim().slice(0, 60) })
        .select('id')
        .single()
      if (convoError) throw convoError
      convoId = newConvo.id
    }

    // ---- Geçmişi çek ----
    const { data: history, error: historyError } = await supabaseClient
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', convoId)
      .order('created_at')
    if (historyError) throw historyError

    // Kullanıcının mesajını kaydet
    await supabaseClient.from('chat_messages').insert({ conversation_id: convoId, role: 'user', content: message.trim() })

    // ---- Basit RAG: mesajla ilgili KB makalelerini ara ----
    let kbContext = ''
    try {
      const { data: articles } = await supabaseClient.rpc('search_kb_articles', {
        p_tenant_id: profile.tenant_id,
        p_query: message.trim(),
        p_limit: 3,
      })
      if (articles?.length) {
        kbContext = '\n\nİlgili bilgi bankası makaleleri (varsa yanıtında kullan):\n' + articles.map((a: { title: string }) => `- ${a.title}`).join('\n')
      }
    } catch {
      // KB araması başarısız olursa sessizce devam et — sohbeti bloklamasın
    }

    const systemPrompt = `Sen HelpFix'in IT destek asistanısın. Kullanıcı ${profile.full_name}. Görevin:
1. Kullanıcının IT sorununu anlayıp mümkünse kendi başına çözüm önermek (adım adım, net, Türkçe).
2. Çözemiyorsan veya kullanıcı açıkça bir talep açılmasını istiyorsa, create_ticket aracını kullan — ama önce kullanıcıya "talep açmamı ister misiniz?" diye sormadan asla açma (kullanıcı zaten "evet aç" dediyse sorma, direkt aç).
3. Kısa ve öz konuş, gereksiz nezaket cümleleri kurma.${kbContext}`

    const messages = [
      ...(history ?? []).map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message.trim() },
    ]

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: systemPrompt,
        messages,
        tools: [CREATE_TICKET_TOOL],
      }),
    })

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text()
      throw new Error(`Claude API hatası (${claudeResponse.status}): ${errText}`)
    }

    const claudeData = await claudeResponse.json()
    const textBlock = claudeData.content?.find((b: { type: string }) => b.type === 'text')
    const toolUseBlock = claudeData.content?.find((b: { type: string }) => b.type === 'tool_use')

    let createdIncident: { id: string; ref: string } | null = null
    let replyText = textBlock?.text ?? ''

    if (toolUseBlock?.name === 'create_ticket') {
      const input = toolUseBlock.input as { title: string; description: string; category: string; priority: string }
      const { data: incident, error: incidentError } = await supabaseClient
        .from('incidents')
        .insert({
          tenant_id: profile.tenant_id,
          title: input.title,
          description: input.description,
          priority: input.priority,
          category: input.category,
          status: 'new',
          channel: 'portal',
          requester_id: profile.id,
          assignee_id: null,
          possible_duplicate_of: null,
          sla_policy_id: null,
          sla_due_at: null,
          csat_score: null,
          ci_id: null,
          resolved_at: null,
          closed_at: null,
          is_major_incident: false,
          major_incident_declared_at: null,
          email_message_id: null,
          custom_fields: {},
        })
        .select('id, ref')
        .single()

      if (!incidentError && incident) {
        createdIncident = incident
        replyText = (replyText ? replyText + '\n\n' : '') + `✅ ${incident.ref} numaralı talebiniz oluşturuldu. Ekibimiz en kısa sürede dönüş yapacak.`
      }
    }

    if (!replyText) replyText = 'Üzgünüm, şu anda yanıt üretemedim. Lütfen tekrar deneyin.'

    // Asistan yanıtını kaydet
    await supabaseClient.from('chat_messages').insert({
      conversation_id: convoId,
      role: 'assistant',
      content: replyText,
      created_incident_id: createdIncident?.id ?? null,
    })

    // Kullanım logu (service_role ile — ai-assist ile aynı desen)
    await supabaseAdmin.from('ai_usage_log').insert({ tenant_id: profile.tenant_id, user_id: profile.id, action: 'chat_message' })

    return new Response(
      JSON.stringify({ conversationId: convoId, reply: replyText, createdIncident }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
