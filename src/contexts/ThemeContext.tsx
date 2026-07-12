import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light'
export type TeamTheme = 'kurumsal' | 'fenerbahce' | 'galatasaray' | 'besiktas' | 'trabzonspor'

export const TEAM_THEMES: { code: TeamTheme; label: string; colors: [string, string] }[] = [
  { code: 'kurumsal', label: 'Kurumsal', colors: ['#17B0A7', '#0E7D76'] },
  { code: 'fenerbahce', label: 'Fenerbahçe', colors: ['#FFE800', '#00285C'] },
  { code: 'galatasaray', label: 'Galatasaray', colors: ['#FFB81C', '#A6192E'] },
  { code: 'besiktas', label: 'Beşiktaş', colors: ['#1A1A1A', '#FFFFFF'] },
  { code: 'trabzonspor', label: 'Trabzonspor', colors: ['#7A1128', '#009DDC'] },
]

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  team: TeamTheme
  setTeam: (t: TeamTheme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'helpfix-theme'
const TEAM_STORAGE_KEY = 'helpfix-team-theme'
const VALID_TEAMS: TeamTheme[] = ['kurumsal', 'fenerbahce', 'galatasaray', 'besiktas', 'trabzonspor']

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-team', team)
    localStorage.setItem(TEAM_STORAGE_KEY, team)
  }, [team])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  function setTeam(t: TeamTheme) {
    setTeamState(t)
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme, team, setTeam }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme, ThemeProvider içinde kullanılmalı')
  return ctx
}
