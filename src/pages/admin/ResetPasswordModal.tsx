import { useState } from 'react'
import { Copy, Check, KeyRound } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useResetPassword, generateTempPassword, type TenantUser } from './useAdmin'

export function ResetPasswordModal({ user, onClose }: { user: TenantUser; onClose: () => void }) {
  const { t } = useLang()
  const resetPassword = useResetPassword()

  const [password, setPassword] = useState(generateTempPassword())
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSubmit() {
    if (password.length < 8) {
      setError(t({ tr: 'Şifre en az 8 karakter olmalı', en: 'Password must be at least 8 characters' }))
      return
    }
    setError(null)
    try {
      await resetPassword.mutateAsync({ userId: user.id, newPassword: password })
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t({ tr: 'Bilinmeyen hata', en: 'Unknown error' }))
    }
  }

  function copyPassword() {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (done) {
    return (
      <Modal open onClose={onClose} title={t({ tr: 'Şifre Yeniden Atandı', en: 'Password Reset' })}>
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-ok flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-white" />
          </div>
          <p className="text-[13px] text-[var(--text-sub)] mb-4">
            {t({
              tr: `${user.full_name} için yeni şifreyi güvenli bir şekilde paylaşın:`,
              en: `Share the new password for ${user.full_name} securely:`,
            })}
          </p>
          <div className="flex items-center gap-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 mb-4">
            <code className="flex-1 text-[13px] font-mono text-left">{password}</code>
            <button onClick={copyPassword} className="text-brand-dim">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-faint)] mb-4">
            {t({
              tr: 'Bu şifre eski şifrenin yerine geçti. Kullanıcı ilk girişte değiştirmelidir.',
              en: 'This password replaces the old one. The user should change it on next login.',
            })}
          </p>
          <Button onClick={onClose}>{t({ tr: 'Tamam', en: 'Done' })}</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Şifreyi Yeniden Ata', en: 'Reset Password' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={resetPassword.isPending}>
            {resetPassword.isPending ? t({ tr: 'Uygulanıyor…', en: 'Applying…' }) : t({ tr: 'Yeni Şifreyi Uygula', en: 'Apply New Password' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 bg-p2-tint border border-p2/40 rounded-lg p-3">
          <KeyRound className="w-4 h-4 text-p2 shrink-0 mt-0.5" />
          <p className="text-[12px] text-[var(--text-sub)]">
            {t({
              tr: `${user.full_name} (${user.email}) için yeni bir şifre atıyorsunuz. Mevcut şifre görüntülenemez — sistemler şifreleri okunabilir biçimde saklamaz, sadece yenisi atanabilir.`,
              en: `You are setting a new password for ${user.full_name} (${user.email}). The current password cannot be viewed — systems never store passwords in readable form, only a new one can be assigned.`,
            })}
          </p>
        </div>
        <div>
          <label className="flex items-center justify-between text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            <span>{t({ tr: 'Yeni Şifre', en: 'New Password' })}</span>
            <button type="button" onClick={() => setPassword(generateTempPassword())} className="text-brand-dim normal-case font-semibold">
              {t({ tr: 'Yeniden Oluştur', en: 'Regenerate' })}
            </button>
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] font-mono"
          />
        </div>
        {error && <p className="text-p1 text-[12px]">{error}</p>}
      </div>
    </Modal>
  )
}
