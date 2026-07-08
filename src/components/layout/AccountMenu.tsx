import { useState } from 'react'
import { User, LogOut, ChevronDown } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { AccountModal } from './AccountModal'

const ROLE_LABEL: Record<string, { tr: string; en: string }> = {
  tenant_admin: { tr: 'Tenant Admin', en: 'Tenant Admin' },
  manager: { tr: 'Ekip Yöneticisi', en: 'Team Manager' },
  agent: { tr: 'Teknisyen', en: 'Agent' },
  requester: { tr: 'Çalışan', en: 'Employee' },
}

export function AccountMenu() {
  const { t } = useLang()
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)

  if (!profile) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--panel)] hover:border-brand"
      >
        <div className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center text-[11px] font-bold shrink-0">
          {profile.avatarInitials ?? profile.fullName.slice(0, 2).toUpperCase()}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-[12px] font-semibold leading-tight max-w-[120px] truncate">{profile.fullName}</div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--text-faint)]" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+8px)] w-[240px] bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-2xl z-40 overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <div className="text-[13px] font-bold truncate">{profile.fullName}</div>
              <div className="text-[11px] text-[var(--text-faint)] truncate">{profile.email}</div>
              <span className="inline-block mt-1.5 text-[9.5px] font-mono font-bold bg-brand-tint text-brand-dim rounded-full px-2 py-0.5">
                {ROLE_LABEL[profile.role]?.tr ?? profile.role}
              </span>
            </div>
            <button
              onClick={() => {
                setShowAccountModal(true)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium hover:bg-[var(--row-hover)]"
            >
              <User className="w-[15px] h-[15px] text-[var(--text-faint)]" />
              {t({ tr: 'Hesabım', en: 'My Account' })}
            </button>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-p1 hover:bg-[var(--row-hover)] border-t border-[var(--border)]"
            >
              <LogOut className="w-[15px] h-[15px]" />
              {t({ tr: 'Çıkış Yap', en: 'Sign Out' })}
            </button>
          </div>
        </>
      )}

      {showAccountModal && <AccountModal onClose={() => setShowAccountModal(false)} />}
    </div>
  )
}
