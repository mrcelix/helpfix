// supabase/functions/create-user/index.ts
//
// Tenant Admin panelinden yeni kullanıcı oluşturmak için Edge Function.
// service_role anahtarı SADECE burada, sunucu tarafında kullanılır —
// tarayıcıya asla gönderilmez. Bu fonksiyon:
//   1. Çağıranın gerçekten tenant_admin olduğunu doğrular
//   2. Yeni bir Supabase Auth kullanıcısı oluşturur
//   3. user_profiles tablosuna aynı tenant'a bağlı bir profil ekler
//   4. Profil oluşturma başarısız olursa auth kullanıcısını geri alır
//
// DEPLOY: Supabase Dashboard → Edge Functions → "create-user" adında
// yeni fonksiyon → bu kodu yapıştır → Deploy. SUPABASE_URL,
// SUPABASE_ANON_KEY ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri
// Supabase tarafından OTOMATİK sağlanır — elle eklemenize gerek yok.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Yetkilendirme başlığı eksik')

    // Çağıranın kimliğini doğrulamak için ANON key + çağıranın token'ı.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Kimlik doğrulanamadı')

    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !callerProfile) throw new Error('Çağıranın profili bulunamadı')
    if (callerProfile.role !== 'tenant_admin') throw new Error('Sadece Tenant Admin yeni kullanıcı oluşturabilir')

    const { email, password, fullName, role, departmentId } = await req.json()
    if (!email || !password || !fullName || !role) {
      throw new Error('Eksik alan: email, password, fullName ve role zorunludur')
    }

    // service_role ile admin istemcisi — RLS'i atlar, auth kullanıcısı oluşturabilir.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError) throw createError

    const initials = fullName
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

    const { error: insertError } = await supabaseAdmin.from('user_profiles').insert({
      tenant_id: callerProfile.tenant_id,
      auth_user_id: newUser.user.id,
      full_name: fullName,
      email,
      role,
      department_id: departmentId || null,
      avatar_initials: initials,
      is_active: true,
    })

    if (insertError) {
      // Profil oluşturulamadıysa, yetim kalan auth kullanıcısını geri al.
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw insertError
    }

    return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
