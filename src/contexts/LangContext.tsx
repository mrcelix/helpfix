import { createContext, useContext, useState, type ReactNode } from 'react'

type Lang = 'tr' | 'en'

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  /** Verilen {tr, en} çiftinden mevcut dile uygun metni döndürür. */
  t: (strings: { tr: string; en: string }) => string
}

const LangContext = createContext<LangContextValue | undefined>(undefined)

const STORAGE_KEY = 'helpfix-lang'

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'en' ? 'en' : 'tr'
  })

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  function t(strings: { tr: string; en: string }) {
    return lang === 'tr' ? strings.tr : strings.en
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang, LangProvider içinde kullanılmalı')
  return ctx
}
