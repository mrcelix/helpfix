import { useEffect, useState } from 'react'
import { Check, Sun, Moon, RotateCcw, Palette } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme, TEAM_THEMES, type CustomColors } from '@/contexts/ThemeContext'
import { useSaveTenantBranding } from './useTenantBranding'

const HEX_RE = /^#[0-9a-fA-F]{6}$/

/** Görünüm / Tema ayarları — açık/koyu mod, hazır tenant presetleri
 * (Kurumsal/FB/GS/BJK/TS) ve logoya göre ayarlanabilen özel renkler
 * (Marka / Koyu Marka / Vurgu). AccountModal "Görünüm" sekmesinde ve
 * dolayısıyla her panelin hesap menüsünde açılır. */
export function AppearanceSettings() {
  const { t } = useLang()
  const { profile } = useAuth()
  const { theme, toggleTheme, team, setTeam, custom, setCustom, hasUserOverride, resetToTenantDefault } = useTheme()
  const saveBranding = useSaveTenantBranding()
  const [savedDefault, setSavedDefault] = useState(false)

  // Metin kutuları için yerel taslak — kullanıcı "#1a2b…" yazarken her ara
  // adımı temaya uygulamayalım; sadece geçerli 6 haneli hex olunca uygula.
  // Tema dışarıdan değişince (preset seçimi) taslakları senkronla.
  const [drafts, setDrafts] = useState<CustomColors>(custom)
  useEffect(() => setDrafts(custom), [custom])

  const isAdmin = profile?.role === 'tenant_admin'

  function updateColor(key: keyof CustomColors, value: string) {
    setDrafts((d) => ({ ...d, [key]: value }))
    if (HEX_RE.test(value)) setCustom({ ...custom, [key]: value })
  }

  async function saveAsTenantDefault() {
    setSavedDefault(false)
    await saveBranding.mutateAsync(
      team === 'custom'
        ? { preset: 'custom', brand: custom.brand, brandDeep: custom.brandDeep, accent: custom.accent }
        : { preset: team, brand: null, brandDeep: null, accent: null }
    )
    setSavedDefault(true)
    setTimeout(() => setSavedDefault(false), 2500)
  }

  return (
    <div className="space-y-5">
      {/* Açık / Koyu mod */}
      <div>
        <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
          {t({ tr: 'Görünüm Modu', en: 'Appearance Mode' })}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                if (theme !== mode) toggleTheme()
              }}
              aria-pressed={theme === mode}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-[13px] font-semibold ${
                theme === mode ? 'border-brand text-brand-dim bg-brand-tint/40' : 'border-[var(--border)] text-[var(--text-sub)]'
              }`}
            >
              {mode === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {mode === 'light' ? t({ tr: 'Açık', en: 'Light' }) : t({ tr: 'Koyu', en: 'Dark' })}
            </button>
          ))}
        </div>
      </div>

      {/* Hazır presetler */}
      <div>
        <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2">
          {t({ tr: 'Hazır Temalar', en: 'Preset Themes' })}
        </label>
        <div className="grid grid-cols-6 gap-2">
          {TEAM_THEMES.map((th) => (
            <button
              key={th.code}
              onClick={() => setTeam(th.code)}
              title={th.label}
              aria-pressed={team === th.code}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span
                className="w-9 h-9 rounded-full border-2 flex items-center justify-center overflow-hidden relative"
                style={{ borderColor: team === th.code ? th.colors[1] : 'transparent' }}
              >
                <span className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${th.colors[0]} 50%, ${th.colors[1]} 50%)` }} />
                {team === th.code && <Check className="w-4 h-4 text-white relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />}
              </span>
              <span className="text-[9px] font-semibold text-[var(--text-faint)] group-hover:text-[var(--text-sub)] leading-none text-center">
                {th.label}
              </span>
            </button>
          ))}
          {/* Özel */}
          <button
            onClick={() => setTeam('custom')}
            title={t({ tr: 'Özel', en: 'Custom' })}
            aria-pressed={team === 'custom'}
            className="flex flex-col items-center gap-1.5 group"
          >
            <span
              className="w-9 h-9 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: team === 'custom' ? 'var(--color-brand)' : 'var(--border)' }}
            >
              {team === 'custom' ? <Check className="w-4 h-4 text-brand" /> : <Palette className="w-4 h-4 text-[var(--text-faint)]" />}
            </span>
            <span className="text-[9px] font-semibold text-[var(--text-faint)] group-hover:text-[var(--text-sub)] leading-none text-center">
              {t({ tr: 'Özel', en: 'Custom' })}
            </span>
          </button>
        </div>
      </div>

      {/* Özel renkler (logoya göre) */}
      <div>
        <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2">
          {t({ tr: 'Özel Renkler (logoya göre)', en: 'Custom Colors (match your logo)' })}
        </label>
        <div className="space-y-2">
          {([
            ['brand', t({ tr: 'Marka Rengi', en: 'Brand Color' })],
            ['brandDeep', t({ tr: 'Koyu Marka Rengi', en: 'Dark Brand Color' })],
            ['accent', t({ tr: 'Vurgu Rengi', en: 'Accent Color' })],
          ] as const).map(([key, labelText]) => (
            <div key={key} className="flex items-center gap-2.5">
              <input
                type="color"
                value={HEX_RE.test(drafts[key]) ? drafts[key] : custom[key]}
                onChange={(e) => updateColor(key, e.target.value)}
                className="w-9 h-9 rounded-lg border border-[var(--border)] bg-transparent cursor-pointer shrink-0 p-0.5"
                aria-label={labelText}
              />
              <span className="text-[12px] font-medium flex-1">{labelText}</span>
              <input
                type="text"
                value={drafts[key]}
                onChange={(e) => updateColor(key, e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)}
                spellCheck={false}
                className="w-[92px] font-mono text-[12px] uppercase bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-center"
              />
            </div>
          ))}
        </div>
        <p className="text-[10.5px] text-[var(--text-faint)] mt-1.5">
          {t({
            tr: 'Bir rengi değiştirdiğinizde tema otomatik olarak "Özel" olur.',
            en: 'Editing any color automatically switches the theme to "Custom".',
          })}
        </p>
      </div>

      {/* Canlı önizleme */}
      <div>
        <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2">
          {t({ tr: 'Önizleme', en: 'Preview' })}
        </label>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 flex items-center gap-2.5">
          <button className="px-3 py-1.5 rounded-lg bg-brand text-white text-[12px] font-bold">
            {t({ tr: 'Marka', en: 'Brand' })}
          </button>
          <span className="text-[10px] font-mono font-bold bg-brand-tint text-brand-dim rounded-full px-2 py-1">
            {t({ tr: 'Rozet', en: 'Badge' })}
          </span>
          <span className="w-6 h-6 rounded-full shrink-0" style={{ background: 'var(--color-accent)' }} title={t({ tr: 'Vurgu', en: 'Accent' })} />
          <span className="ml-auto text-[11px] text-[var(--text-faint)]">{t({ tr: 'Örnek metin', en: 'Sample text' })}</span>
        </div>
      </div>

      {/* Kişisel override → tenant varsayılanına dön */}
      {hasUserOverride && (
        <button
          onClick={resetToTenantDefault}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-sub)] hover:text-[var(--text)]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t({ tr: 'Tenant varsayılanına dön', en: 'Reset to organization default' })}
        </button>
      )}

      {/* Admin: tüm tenant için varsayılan yap */}
      {isAdmin && (
        <div className="pt-3 border-t border-[var(--border)]">
          <button
            onClick={saveAsTenantDefault}
            disabled={saveBranding.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand text-white text-[13px] font-bold disabled:opacity-50"
          >
            {savedDefault ? (
              <>
                <Check className="w-4 h-4" /> {t({ tr: 'Tenant varsayılanı kaydedildi', en: 'Saved as organization default' })}
              </>
            ) : saveBranding.isPending ? (
              t({ tr: 'Kaydediliyor…', en: 'Saving…' })
            ) : (
              t({ tr: 'Bu temayı tüm tenant için varsayılan yap', en: 'Set as default for the whole organization' })
            )}
          </button>
          {saveBranding.isError && (
            <p className="text-p1 text-[11px] mt-1.5">
              {t({ tr: 'Kaydedilemedi. Yetkinizi kontrol edin.', en: 'Could not save. Check your permissions.' })}
            </p>
          )}
          <p className="text-[10.5px] text-[var(--text-faint)] mt-1.5">
            {t({
              tr: 'Bu, kendi teması olmayan tüm kullanıcıların varsayılanını değiştirir.',
              en: 'This changes the default for all users who have not chosen their own theme.',
            })}
          </p>
        </div>
      )}
    </div>
  )
}
