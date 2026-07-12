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

// "Beni Hatırla" — Login.tsx, oturum açmadan HEMEN ÖNCE bu anahtarı
// localStorage'a yazar ('1' = hatırla, '0' = hatırlama). Aşağıdaki
// dinamik storage adaptörü, Supabase'in oturum jetonunu nereye
// yazacağına/nereden okuyacağına bu tercihe göre karar verir:
//   - hatırla (varsayılan, anahtar hiç yoksa da bu sayılır) → localStorage
//     (tarayıcı kapatılıp açılsa bile oturum devam eder)
//   - hatırlama → sessionStorage (sekme/tarayıcı kapanınca oturum biter)
export const REMEMBER_ME_KEY = 'helpfix-remember-me'

function activeAuthStorage(): Storage {
  return localStorage.getItem(REMEMBER_ME_KEY) === '0' ? sessionStorage : localStorage
}

const dynamicAuthStorage = {
  getItem: (key: string) => activeAuthStorage().getItem(key),
  setItem: (key: string, value: string) => activeAuthStorage().setItem(key, value),
  removeItem: (key: string) => activeAuthStorage().removeItem(key),
}

// Geçersiz/boş URL ile createClient çağrısı anında throw eder ve tüm
// uygulamayı daha render olmadan çökertir. Bunun yerine, yapılandırma
// eksikse geçerli bir placeholder URL kullanıp isSupabaseConfigured
// bayrağıyla App.tsx'te kullanıcıya anlaşılır bir ekran gösteriyoruz.
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: dynamicAuthStorage,
    },
  }
)

