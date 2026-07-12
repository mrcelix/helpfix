import { Check } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useTheme, TEAM_THEMES } from '@/contexts/ThemeContext'

/** Çalışan Merkezi > Hesabım menüsünde gösterilen takım teması seçici.
 * Sadece marka vurgu rengini değiştirir (bkz. index.css [data-team]
 * kuralları) — Kurumsal varsayılan, artı 4 Türk futbol takımı teması. */
export function TeamThemeSelector() {
  const { t } = useLang()
  const { team, setTeam } = useTheme()

  return (
    <div className="px-4 py-3 border-t border-[var(--border)]">
      <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2">
        {t({ tr: 'Tema', en: 'Theme' })}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {TEAM_THEMES.map((th) => (
          <button
            key={th.code}
            onClick={() => setTeam(th.code)}
            title={th.label}
            className="flex flex-col items-center gap-1.5 group"
          >
            <span
              className="w-8 h-8 rounded-full border-2 flex items-center justify-center overflow-hidden relative"
              style={{ borderColor: team === th.code ? th.colors[1] : 'transparent' }}
            >
              <span className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${th.colors[0]} 50%, ${th.colors[1]} 50%)` }} />
              {team === th.code && <Check className="w-3.5 h-3.5 text-white relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />}
            </span>
            <span className="text-[9px] font-semibold text-[var(--text-faint)] group-hover:text-[var(--text-sub)] leading-none text-center">
              {th.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
