import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { Button } from '@/components/ui/Button'
import { supabase, REMEMBER_ME_KEY } from '@/lib/supabase'

type Mode = 'signin' | 'forgot' | 'forgot-sent' | 'reset-password'

export function LoginPage() {
  const { signInWithPassword, sendPasswordResetEmail, updatePassword } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Supabase, şifre sıfırlama linkinden dönüldüğünde bu event'i tetikler
  // — ekranı otomatik "yeni şifre belirle" moduna geçiriyoruz.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('reset-password')
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSignIn(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    // Supabase'in oturum jetonunu localStorage'a mı (hatırla) yoksa
    // sessionStorage'a mı (hatırlama, sekme kapanınca oturum biter)
    // yazacağını, oturum açmadan ÖNCE belirlememiz gerekiyor.
    localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? '1' : '0')
    const { error } = await signInWithPassword(email, password)
    setLoading(false)
    if (error) {
      setError(t({ tr: 'E-posta veya şifre hatalı.', en: 'Incorrect email or password.', fr: 'E-mail ou mot de passe incorrect.', it: 'E-mail o password errati.', ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' }))
      return
    }
    navigate('/')
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await sendPasswordResetEmail(email)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    setMode('forgot-sent')
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      setError(t({ tr: 'Şifre en az 8 karakter olmalı.', en: 'Password must be at least 8 characters.', fr: 'Le mot de passe doit contenir au moins 8 caractères.', it: 'La password deve contenere almeno 8 caratteri.', ar: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.' }))
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await updatePassword(newPassword)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="absolute top-5 right-5">
        <LanguageSwitcher alwaysVisible />
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
          {mode === 'signin' && (
            <>
              <h1 className="font-display font-bold text-lg mb-1">{t({ tr: 'Giriş Yap', en: 'Sign In', fr: 'Se connecter', it: 'Accedi', ar: 'تسجيل الدخول' })}</h1>
              <p className="text-[13px] text-[var(--text-faint)] mb-6">
                {t({ tr: 'Kurumsal hesabınızla devam edin', en: 'Continue with your work account', fr: 'Continuez avec votre compte professionnel', it: 'Continua con il tuo account aziendale', ar: 'تابع باستخدام حساب العمل الخاص بك' })}
              </p>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                    {t({ tr: 'E-posta', en: 'Email', fr: 'E-mail', it: 'Email', ar: 'البريد الإلكتروني' })}
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide">
                      {t({ tr: 'Şifre', en: 'Password', fr: 'Mot de passe', it: 'Password', ar: 'كلمة المرور' })}
                    </label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null) }}
                      className="text-[11px] font-semibold text-brand-dim"
                    >
                      {t({ tr: 'Şifremi unuttum', en: 'Forgot password', fr: 'Mot de passe oublié', it: 'Password dimenticata', ar: 'نسيت كلمة المرور' })}
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand"
                    placeholder="••••••••"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border)] accent-brand"
                  />
                  <span className="text-[12.5px] text-[var(--text-sub)]">
                    {t({ tr: 'Beni hatırla', en: 'Remember me', fr: 'Se souvenir de moi', it: 'Ricordami', ar: 'تذكرني' })}
                  </span>
                </label>

                {error && <p className="text-p1 text-xs">{error}</p>}

                <Button type="submit" disabled={loading} className="w-full justify-center">
                  {loading ? t({ tr: 'Giriş yapılıyor…', en: 'Signing in…', fr: 'Connexion en cours…', it: 'Accesso in corso…', ar: 'جارٍ تسجيل الدخول…' }) : t({ tr: 'Giriş Yap', en: 'Sign In', fr: 'Se connecter', it: 'Accedi', ar: 'تسجيل الدخول' })}
                </Button>
              </form>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <h1 className="font-display font-bold text-lg mb-1">{t({ tr: 'Şifremi Unuttum', en: 'Forgot Password', fr: 'Mot de passe oublié', it: 'Password dimenticata', ar: 'نسيت كلمة المرور' })}</h1>
              <p className="text-[13px] text-[var(--text-faint)] mb-6">
                {t({ tr: 'E-posta adresinize bir sıfırlama linki gönderelim.', en: "We'll send a reset link to your email." })}
              </p>
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                    {t({ tr: 'E-posta', en: 'Email', fr: 'E-mail', it: 'Email', ar: 'البريد الإلكتروني' })}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand"
                  />
                </div>
                {error && <p className="text-p1 text-xs">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full justify-center">
                  {loading ? t({ tr: 'Gönderiliyor…', en: 'Sending…', fr: 'Envoi en cours…', it: 'Invio in corso…', ar: 'جارٍ الإرسال…' }) : t({ tr: 'Sıfırlama Linki Gönder', en: 'Send Reset Link', fr: 'Envoyer le lien de réinitialisation', it: 'Invia link di reimpostazione', ar: 'إرسال رابط إعادة التعيين' })}
                </Button>
                <button type="button" onClick={() => setMode('signin')} className="w-full text-center text-[12px] font-semibold text-[var(--text-faint)]">
                  {t({ tr: '← Girişe dön', en: '← Back to sign in', fr: '← Retour à la connexion', it: "← Torna all'accesso", ar: '→ العودة لتسجيل الدخول' })}
                </button>
              </form>
            </>
          )}

          {mode === 'forgot-sent' && (
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-ok flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path d="M5 12l4 4L19 6" />
                </svg>
              </div>
              <p className="text-[13.5px] text-[var(--text-sub)] mb-5">
                {t({ tr: `${email} adresine bir sıfırlama linki gönderdik.`, en: `We sent a reset link to ${email}.`, fr: `Nous avons envoyé un lien de réinitialisation à ${email}.`, it: `Abbiamo inviato un link di reimpostazione a ${email}.`, ar: `لقد أرسلنا رابط إعادة التعيين إلى ${email}.` })}
              </p>
              <button onClick={() => setMode('signin')} className="text-[12.5px] font-semibold text-brand-dim">
                {t({ tr: '← Girişe dön', en: '← Back to sign in', fr: '← Retour à la connexion', it: "← Torna all'accesso", ar: '→ العودة لتسجيل الدخول' })}
              </button>
            </div>
          )}

          {mode === 'reset-password' && (
            <>
              <h1 className="font-display font-bold text-lg mb-1">{t({ tr: 'Yeni Şifre Belirle', en: 'Set New Password', fr: 'Définir un nouveau mot de passe', it: 'Imposta nuova password', ar: 'تعيين كلمة مرور جديدة' })}</h1>
              <p className="text-[13px] text-[var(--text-faint)] mb-6">
                {t({ tr: 'Hesabınız için yeni bir şifre girin.', en: 'Enter a new password for your account.', fr: 'Entrez un nouveau mot de passe pour votre compte.', it: 'Inserisci una nuova password per il tuo account.', ar: 'أدخل كلمة مرور جديدة لحسابك.' })}
              </p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                    {t({ tr: 'Yeni Şifre', en: 'New Password', fr: 'Nouveau mot de passe', it: 'Nuova password', ar: 'كلمة المرور الجديدة' })}
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand"
                    placeholder="••••••••"
                  />
                </div>
                {error && <p className="text-p1 text-xs">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full justify-center">
                  {loading ? t({ tr: 'Kaydediliyor…', en: 'Saving…', fr: 'Enregistrement…', it: 'Salvataggio…', ar: 'جارٍ الحفظ…' }) : t({ tr: 'Şifreyi Güncelle', en: 'Update Password', fr: 'Mettre à jour le mot de passe', it: 'Aggiorna password', ar: 'تحديث كلمة المرور' })}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
