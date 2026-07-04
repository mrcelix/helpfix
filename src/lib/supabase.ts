import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[HelpFix] Supabase ortam değişkenleri eksik. .env dosyanızı .env.example\'a göre doldurun.'
  )
}

export const supabase = createClient<Database>(
  supabaseUrl ?? '',
  supabaseAnonKey ?? ''
)
