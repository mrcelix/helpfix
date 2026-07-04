import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'

export function LoginPage() {
  const { signInWithPassword } = useAuth()
  const { t, lang, setLang } = useLang()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signInWithPassword(email, password)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/service-desk')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="absolute top-5 right-5 flex border border-[var(--border)] rounded-lg overflow-hidden text-[11.5px] font-semibold">
        {(['tr', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={l === lang ? 'bg-brand text-white px-2.5 py-1.5' : 'text-[var(--text-faint)] px-2.5 py-1.5'}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand to-brand-dim flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
              <path d="M12 2 L14.5 8.5 L21 9 L16 13.5 L17.5 20 L12 16.5 L6.5 20 L8 13.5 L3 9 L9.5 8.5 Z" />
            </svg>
          </div>
          <span className="font-display font-bold text-xl">HelpFix</span>
        </div>

        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-7">
          <h1 className="font-display font-bold text-lg mb-1">{t({ tr: 'Giriş Yap', en: 'Sign In' })}</h1>
          <p className="text-[13px] text-[var(--text-faint)] mb-6">
            {t({ tr: 'Kurumsal hesabınızla devam edin', en: 'Continue with your work account' })}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                {t({ tr: 'E-posta', en: 'Email' })}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="ad.soyad@sirket.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                {t({ tr: 'Şifre', en: 'Password' })}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-p1 text-xs">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full justify-center">
              {loading ? t({ tr: 'Giriş yapılıyor…', en: 'Signing in…' }) : t({ tr: 'Giriş Yap', en: 'Sign In' })}
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-[var(--border)] text-center">
            <button className="text-[12.5px] font-semibold text-brand-dim">
              {t({ tr: 'SSO ile giriş yap', en: 'Sign in with SSO' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
