import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light'
export type TeamTheme = 'kurumsal' | 'fenerbahce' | 'galatasaray' | 'besiktas' | 'trabzonspor' | 'custom'

/** Custom modda logoya göre elle ayarlanan üç renk. */
export interface CustomColors {
  brand: string // Marka Rengi       → --color-brand
  brandDeep: string // Koyu Marka Rengi  → --color-brand-dim
  accent: string // Vurgu Rengi       → --color-accent
}

export const DEFAULT_CUSTOM: CustomColors = { brand: '#17B0A7', brandDeep: '#0E7D76', accent: '#A78BFA' }

/** Hazır tenant presetleri — Kurumsal + 4 Türk futbol takımı (index.css'teki
 * [data-team] kurallarıyla birebir). colors: [açık vurgu, koyu vurgu] → swatch. */
export const TEAM_THEMES: { code: Exclude<TeamTheme, 'custom'>; label: string; colors: [string, string] }[] = [
  { code: 'kurumsal', label: 'Kurumsal', colors: ['#17B0A7', '#0E7D76'] },
  { code: 'fenerbahce', label: 'FB', colors: ['#FFE800', '#0A2E63'] },
  { code: 'galatasaray', label: 'GS', colors: ['#FFD447', '#7A0C1E'] },
  { code: 'besiktas', label: 'BJK', colors: ['#0A0A0A', '#FFFFFF'] },
  { code: 'trabzonspor', label: 'TS', colors: ['#5C0E22', '#4FD1F2'] },
]

export interface TenantBranding {
  preset: TeamTheme
  brand: string | null
  brandDeep: string | null
  accent: string | null
}

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  team: TeamTheme
  /** Kullanıcı bir preset seçer (override olarak işaretlenir). */
  setTeam: (t: TeamTheme) => void
  custom: CustomColors
  /** Kullanıcı özel renkleri düzenler → team otomatik 'custom' olur. */
  setCustom: (c: CustomColors) => void
  /** Kullanıcı kendi seçimini yaptı mı? true ise tenant varsayılanı ezmez. */
  hasUserOverride: boolean
  /** Tenant varsayılan markasını uygular — sadece kullanıcı override'ı yoksa. */
  applyTenantBranding: (b: TenantBranding) => void
  /** Kişisel override'ı temizleyip tenant varsayılanına döner. */
  resetToTenantDefault: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'helpfix-theme'
const TEAM_STORAGE_KEY = 'helpfix-team-theme'
const CUSTOM_STORAGE_KEY = 'helpfix-custom-brand'
const OVERRIDE_KEY = 'helpfix-brand-source' // 'user' → kullanıcı override'ı var
const VALID_TEAMS: TeamTheme[] = ['kurumsal', 'fenerbahce', 'galatasaray', 'besiktas', 'trabzonspor', 'custom']

// --- küçük hex yardımcıları (tint türetmek için) --------------------------
function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)))
}
function parseHex(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}
function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`
}
/** brand rengini beyazla karıştırarak açık "tint" tonu üretir (badge zeminleri). */
function tint(hex: string, amount = 0.86): string {
  const rgb = parseHex(hex)
  if (!rgb) return '#E4F7F5'
  const [r, g, b] = rgb
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
}

function readStoredCustom(): CustomColors {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (typeof p?.brand === 'string' && typeof p?.brandDeep === 'string' && typeof p?.accent === 'string') {
        return { brand: p.brand, brandDeep: p.brandDeep, accent: p.accent }
      }
    }
  } catch {
    /* bozuk JSON → varsayılan */
  }
  return DEFAULT_CUSTOM
}

/** documentElement'e custom marka renklerini inline değişken olarak yazar.
 * Inline stil, [data-team] CSS kurallarını ezerek custom rengin geçerli
 * olmasını sağlar. Preset moda dönünce clearCustomVars ile temizlenir. */
function applyCustomVars(colors: CustomColors) {
  const el = document.documentElement
  el.style.setProperty('--color-brand', colors.brand)
  el.style.setProperty('--color-brand-dim', colors.brandDeep)
  el.style.setProperty('--color-brand-tint', tint(colors.brand))
  el.style.setProperty('--color-accent', colors.accent)
}
function clearCustomVars() {
  const el = document.documentElement
  el.style.removeProperty('--color-brand')
  el.style.removeProperty('--color-brand-dim')
  el.style.removeProperty('--color-brand-tint')
  el.style.removeProperty('--color-accent')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  const [team, setTeamState] = useState<TeamTheme>(() => {
    const stored = localStorage.getItem(TEAM_STORAGE_KEY)
    return (VALID_TEAMS as string[]).includes(stored ?? '') ? (stored as TeamTheme) : 'kurumsal'
  })

  const [custom, setCustomState] = useState<CustomColors>(readStoredCustom)
  const [hasUserOverride, setHasUserOverride] = useState<boolean>(() => localStorage.getItem(OVERRIDE_KEY) === 'user')

  // Tenant varsayılanını "sıfırla" için hatırla (resetToTenantDefault).
  const tenantDefaultRef = useRef<TenantBranding | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-team', team)
    localStorage.setItem(TEAM_STORAGE_KEY, team)
  }, [team])

  // Custom modda inline renk değişkenlerini uygula; preset moda dönünce temizle.
  useEffect(() => {
    if (team === 'custom') {
      applyCustomVars(custom)
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(custom))
    } else {
      clearCustomVars()
    }
  }, [team, custom])

  function markUserOverride() {
    setHasUserOverride(true)
    localStorage.setItem(OVERRIDE_KEY, 'user')
  }

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  function setTeam(t: TeamTheme) {
    setTeamState(t)
    markUserOverride()
  }

  function setCustom(c: CustomColors) {
    setCustomState(c)
    setTeamState('custom')
    markUserOverride()
  }

  function applyTenantBranding(b: TenantBranding) {
    tenantDefaultRef.current = b
    // Kullanıcı kendi tercihini yaptıysa tenant varsayılanı ezmez.
    if (localStorage.getItem(OVERRIDE_KEY) === 'user') return
    if (b.preset === 'custom' && b.brand && b.brandDeep && b.accent) {
      setCustomState({ brand: b.brand, brandDeep: b.brandDeep, accent: b.accent })
    }
    setTeamState(b.preset)
  }

  function resetToTenantDefault() {
    localStorage.removeItem(OVERRIDE_KEY)
    setHasUserOverride(false)
    const b = tenantDefaultRef.current
    if (b) {
      if (b.preset === 'custom' && b.brand && b.brandDeep && b.accent) {
        setCustomState({ brand: b.brand, brandDeep: b.brandDeep, accent: b.accent })
      }
      setTeamState(b.preset)
    } else {
      setTeamState('kurumsal')
    }
  }

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, team, setTeam, custom, setCustom, hasUserOverride, applyTenantBranding, resetToTenantDefault }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme, ThemeProvider içinde kullanılmalı')
  return ctx
}
