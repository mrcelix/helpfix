import { useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang, pickLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { AppearanceSettings } from './AppearanceSettings'

const ROLE_LABEL: Record<string, { tr: string; en: string }> = {
  tenant_admin: { tr: 'Tenant Admin', en: 'Tenant Admin' },
  manager: { tr: 'Ekip Yöneticisi', en: 'Team Manager' },
  agent: { tr: 'Teknisyen', en: 'Agent' },
  requester: { tr: 'Çalışan', en: 'Employee' },
}

export function AccountModal({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLang()
  const { profile, updateFullName, updatePassword } = useAuth()
  const [tab, setTab] = useState<'profile' | 'security' | 'appearance'>('profile')

  const [fullName, setFullName] = useState(profile?.fullName ?? '')
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleSaveName() {
    if (!fullName.trim()) return
    setSavingName(true)
    setNameError(null)
    setNameSaved(false)
    const { error } = await updateFullName(fullName.trim())
    setSavingName(false)
    if (error) {
      setNameError(error)
      return
    }
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function handleChangePassword() {
    setPasswordError(null)
    if (newPassword.length < 8) {
      setPasswordError(t({ tr: 'Şifre en az 8 karakter olmalı.', en: 'Password must be at least 8 characters.' }))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t({ tr: 'Şifreler eşleşmiyor.', en: 'Passwords do not match.' }))
      return
    }
    setSavingPassword(true)
    const { error } = await updatePassword(newPassword)
    setSavingPassword(false)
    if (error) {
      setPasswordError(error)
      return
    }
    setPasswordSaved(true)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPasswordSaved(false), 2500)
  }

  if (!profile) return null

  return (
    <Modal open onClose={onClose} title={t({ tr: 'Hesabım', en: 'My Account' })} widthClass="max-w-[480px]">
      <div className="flex gap-1 border-b border-[var(--border)] mb-4">
        <button
          onClick={() => setTab('profile')}
          className={`px-1 py-2 text-[13px] font-semibold mr-4 border-b-2 ${tab === 'profile' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Profil', en: 'Profile' })}
        </button>
        <button
          onClick={() => setTab('security')}
          className={`px-1 py-2 text-[13px] font-semibold mr-4 border-b-2 ${tab === 'security' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Güvenlik', en: 'Security' })}
        </button>
        <button
          onClick={() => setTab('appearance')}
          className={`px-1 py-2 text-[13px] font-semibold mr-4 border-b-2 ${tab === 'appearance' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Görünüm', en: 'Appearance' })}
        </button>
      </div>

      {tab === 'appearance' && <AppearanceSettings />}

      {tab === 'profile' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center text-[18px] font-bold shrink-0">
              {profile.avatarInitials ?? profile.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-[14px] font-bold">{profile.fullName}</div>
              <span className="inline-block mt-1 text-[9.5px] font-mono font-bold bg-brand-tint text-brand-dim rounded-full px-2 py-0.5">
                {ROLE_LABEL[profile.role] ? pickLang(ROLE_LABEL[profile.role], lang) : profile.role}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Ad Soyad', en: 'Full Name' })}
            </label>
            <div className="flex gap-2">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || fullName.trim() === profile.fullName}
                className="px-3.5 rounded-lg bg-brand text-white text-[12px] font-bold disabled:opacity-40 shrink-0"
              >
                {nameSaved ? <Check className="w-4 h-4" /> : t({ tr: 'Kaydet', en: 'Save' })}
              </button>
            </div>
            {nameError && <p className="text-p1 text-[11px] mt-1">{nameError}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'E-posta', en: 'Email' })}
            </label>
            <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--text-faint)]">
              {profile.email}
            </div>
            <p className="text-[10.5px] text-[var(--text-faint)] mt-1">
              {t({ tr: 'E-posta değiştirmek için yöneticinizle iletişime geçin.', en: 'Contact your admin to change your email.' })}
            </p>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Yeni Şifre', en: 'New Password' })}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Yeni Şifre (Tekrar)', en: 'Confirm New Password' })}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
            />
          </div>
          {passwordError && <p className="text-p1 text-[11px]">{passwordError}</p>}
          {passwordSaved && <p className="text-ok text-[11px]">✓ {t({ tr: 'Şifreniz güncellendi.', en: 'Your password has been updated.' })}</p>}
          <Button onClick={handleChangePassword} disabled={savingPassword || !newPassword} className="w-full justify-center">
            {savingPassword ? t({ tr: 'Güncelleniyor…', en: 'Updating…' }) : t({ tr: 'Şifreyi Güncelle', en: 'Update Password' })}
          </Button>
        </div>
      )}
    </Modal>
  )
}
