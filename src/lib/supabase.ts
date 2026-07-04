import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    '[HelpFix] Supabase ortam değişkenleri eksik (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
      'GitHub Actions secrets\'a eklenip yeniden deploy edilmesi gerekiyor.'
  )
}

// Geçersiz/boş URL ile createClient çağrısı anında throw eder ve tüm
// uygulamayı daha render olmadan çökertir. Bunun yerine, yapılandırma
// eksikse geçerli bir placeholder URL kullanıp isSupabaseConfigured
// bayrağıyla App.tsx'te kullanıcıya anlaşılır bir ekran gösteriyoruz.
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)
