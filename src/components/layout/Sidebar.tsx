import { NavLink } from 'react-router-dom'
import { Settings, X } from 'lucide-react'
import { NAV_MODULES } from './nav-modules'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatureFlags } from '@/pages/admin/useAdmin'
import { cn } from '@/lib/utils'

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const { data: flags } = useFeatureFlags()

  const visibleModules = NAV_MODULES.filter((m) => flags?.[m.code] ?? true)

  return (
    <>
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-dim flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="white">
            <path d="M12 2 L14.5 8.5 L21 9 L16 13.5 L17.5 20 L12 16.5 L6.5 20 L8 13.5 L3 9 L9.5 8.5 Z" />
          </svg>
        </div>
        <div>
          <div className="font-display font-bold text-[17px] tracking-tight leading-none">HelpFix</div>
          <div className="text-[11px] text-[var(--text-faint)] mt-0.5">
            {t({ tr: 'Yönetim Paneli', en: 'Admin Panel' })}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-1">
        {visibleModules.map((mod) => {
          const Icon = mod.icon
          return (
            <NavLink
              key={mod.code}
              to={mod.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium mb-0.5 transition-colors',
                  isActive
                    ? 'bg-brand text-white font-semibold'
                    : 'text-[var(--text-sub)] hover:bg-[var(--row-hover)] hover:text-[var(--text)]'
                )
              }
            >
              <Icon className="w-[17px] h-[17px] shrink-0" />
              <span>{mod.name[lang]}</span>
              {mod.badge === 'beta' && (
                <span className="ml-auto text-[9px] font-mono font-bold bg-purple-tint text-purple rounded-full px-1.5 py-0.5">
                  BETA
                </span>
              )}
            </NavLink>
          )
        })}

        {profile?.role === 'tenant_admin' && (
          <>
            <div className="h-px bg-[var(--border)] my-2 mx-1" />
            <NavLink
              to="/admin"
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium mb-0.5 transition-colors',
                  isActive
                    ? 'bg-brand text-white font-semibold'
                    : 'text-[var(--text-sub)] hover:bg-[var(--row-hover)] hover:text-[var(--text)]'
                )
              }
            >
              <Settings className="w-[17px] h-[17px] shrink-0" />
              <span>{t({ tr: 'Yönetim Paneli', en: 'Admin Panel' })}</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="border-t border-[var(--border)] p-3 flex items-center gap-2.5">
        <div className="w-[30px] h-[30px] rounded-lg bg-brand text-white flex items-center justify-center text-xs font-bold shrink-0">
          {profile?.avatarInitials ?? profile?.fullName?.slice(0, 2).toUpperCase() ?? '—'}
        </div>
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold truncate">{profile?.fullName ?? '—'}</div>
          <div className="text-[11px] text-[var(--text-faint)] truncate">
            {profile ? t(ROLE_LABEL[profile.role]) : ''}
          </div>
        </div>
      </div>
    </>
  )
}

/** Masaüstü/tablet (lg+): her zaman görünen sabit sidebar. */
export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-[248px] shrink-0 h-screen sticky top-0 flex-col bg-[var(--panel)] border-r border-[var(--border)]">
      <SidebarContent />
    </aside>
  )
}

/** Mobil (< lg): hamburger ile açılan slide-over drawer. */
export function MobileSidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <aside className="relative w-[248px] max-w-[80vw] h-full flex flex-col bg-[var(--panel)] border-r border-[var(--border)] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-3 w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text)]"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  )
}

const ROLE_LABEL: Record<string, { tr: string; en: string }> = {
  tenant_admin: { tr: 'Tenant Admin', en: 'Tenant Admin' },
  manager: { tr: 'Ekip Yöneticisi', en: 'Team Manager' },
  agent: { tr: 'Teknisyen', en: 'Agent' },
  requester: { tr: 'Son Kullanıcı', en: 'Requester' },
}
