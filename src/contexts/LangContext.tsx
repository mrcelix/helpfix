import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Lang = 'tr' | 'en' | 'fr' | 'it' | 'ar'

export const SUPPORTED_LANGS: { code: Lang; label: string; nativeLabel: string }[] = [
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
]

const RTL_LANGS: Lang[] = ['ar']

interface TranslationStrings {
  tr: string
  en: string
  fr?: string
  it?: string
  ar?: string
}

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  dir: 'ltr' | 'rtl'
  /** Verilen dil setinden mevcut dile uygun metni döndürür. FR/IT/AR
   * henüz çevrilmemişse (çoğu modül-içi metin için normal — 1000+
   * çeviri noktasının tamamı henüz 5 dile taşınmadı) otomatik olarak
   * İngilizce'ye düşer, hiçbir zaman boş/undefined göstermez. */
  t: (strings: TranslationStrings) => string
}

const LangContext = createContext<LangContextValue | undefined>(undefined)

const STORAGE_KEY = 'helpfix-lang'
const VALID_LANGS: Lang[] = ['tr', 'en', 'fr', 'it', 'ar']

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return (VALID_LANGS as string[]).includes(stored ?? '') ? (stored as Lang) : 'tr'
  })

  const dir: 'ltr' | 'rtl' = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', dir)
  }, [lang, dir])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  function t(strings: TranslationStrings) {
    return strings[lang] ?? strings.en ?? strings.tr
  }

  return <LangContext.Provider value={{ lang, setLang, dir, t }}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang, LangProvider içinde kullanılmalı')
  return ctx
}

/** Kod tabanında yerel olarak tanımlanmış onlarca `Record<X, {tr,en}>`
 * biçimindeki etiket sözlüğünü (STATUS_LABEL[status][lang] gibi)
 * güvenle indexlemek için — FR/IT/AR için henüz karşılık girilmemişse
 * İngilizce'ye düşer, asla undefined döndürmez. */
export function pickLang(dict: { tr: string; en: string; fr?: string; it?: string; ar?: string }, lang: Lang): string {
  return dict[lang] ?? dict.en
}

