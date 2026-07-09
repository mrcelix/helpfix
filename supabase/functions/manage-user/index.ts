// supabase/functions/manage-user/index.ts
//
// Tenant Admin panelinden mevcut kullanıcılar üzerinde CRUD için Edge
// Function. service_role anahtarı SADECE burada, sunucu tarafında
// kullanılır — tarayıcıya asla gönderilmez.
//
// ÖNEMLİ: Supabase (ve hiçbir düzgün auth sistemi) şifreleri okunabilir
// biçimde saklamaz — sadece tek yönlü hash tutulur. Bu yüzden "mevcut
// şifreyi görüntüleme" diye bir işlem YOKTUR ve olamaz. Bunun yerine
// admin.updateUserById ile kullanıcıya YENİ bir şifre atanır (reset).
//
// Desteklenen action'lar:
//   'update'          — full_name / email / role / departmentId / isActive
//   'reset-password'  — verilen yeni şifreyi auth kullanıcısına uygular
//   'delete'          — hem auth kullanıcısını hem profil satırını siler
//
// Her istekte: çağıranın gerçekten tenant_admin olduğu ve hedef
// kullanıcının aynı tenant'ta olduğu doğrulanır. Bir admin kendi
// hesabını bu fonksiyonla silemez (kilitlenmeyi önlemek için).
//
// DEPLOY: Supabase Dashboard → Edge Functions → "manage-user" adında
// yeni fonksiyon → bu kodu yapıştır → Deploy. SUPABASE_URL,
// SUPABASE_ANON_KEY ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri
// Supabase tarafından OTOMATİK sağlanır.

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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user: callerAuthUser },
    } = await supabaseClient.auth.getUser()
    if (!callerAuthUser) throw new Error('Kimlik doğrulanamadı')

    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('id, tenant_id, role')
      .eq('auth_user_id', callerAuthUser.id)
      .single()

    if (profileError || !callerProfile) throw new Error('Çağıranın profili bulunamadı')
    if (callerProfile.role !== 'tenant_admin') throw new Error('Sadece Tenant Admin kullanıcı yönetebilir')

    const body = await req.json()
    const { action, userId } = body
    if (!action || !userId) throw new Error('Eksik alan: action ve userId zorunludur')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Hedef profilin gerçekten çağıranla aynı tenant'ta olduğunu doğrula —
    // aksi halde bir tenant admin'i başka bir tenant'ın kullanıcısını
    // değiştirebilir/silebilirdi.
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, tenant_id, auth_user_id')
      .eq('id', userId)
      .single()

    if (targetError || !targetProfile) throw new Error('Hedef kullanıcı bulunamadı')
    if (targetProfile.tenant_id !== callerProfile.tenant_id) throw new Error('Bu kullanıcı sizin tenant\'ınıza ait değil')

    if (action === 'update') {
      const { email, fullName, role, departmentId, isActive } = body

      if (email) {
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(targetProfile.auth_user_id, {
          email,
        })
        if (authUpdateError) throw authUpdateError
      }

      const patch: Record<string, unknown> = {}
      if (fullName !== undefined) patch.full_name = fullName
      if (email !== undefined) patch.email = email
      if (role !== undefined) patch.role = role
      if (departmentId !== undefined) patch.department_id = departmentId || null
      if (isActive !== undefined) patch.is_active = isActive

      if (Object.keys(patch).length > 0) {
        const { error: updateError } = await supabaseAdmin.from('user_profiles').update(patch).eq('id', userId)
        if (updateError) throw updateError
      }

      return ok({ success: true })
    }

    if (action === 'reset-password') {
      const { newPassword } = body
      if (!newPassword || newPassword.length < 8) throw new Error('Yeni şifre en az 8 karakter olmalı')

      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(targetProfile.auth_user_id, {
        password: newPassword,
      })
      if (pwError) throw pwError

      return ok({ success: true })
    }

    if (action === 'delete') {
      if (targetProfile.id === callerProfile.id) throw new Error('Kendi hesabınızı bu ekrandan silemezsiniz')

      const { error: deleteProfileError } = await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
      if (deleteProfileError) throw deleteProfileError

      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetProfile.auth_user_id)
      if (deleteAuthError) throw deleteAuthError

      return ok({ success: true })
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

function ok(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}
