import { NavLink, Link } from 'react-router-dom'
import { Settings, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { NAV_MODULES, ICON_MAP } from './nav-modules'
import { useLang, pickLang} from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { useNavConfig, ROLE_ORDER } from '@/pages/admin/useAdmin'
import { useNavBadgeCounts } from './useNavBadgeCounts'
import { PoweredByFooter } from './PoweredByFooter'
import { cn } from '@/lib/utils'

function SidebarContent({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const { data: navConfig } = useNavConfig()
  const { data: badgeCounts } = useNavBadgeCounts()

  const myRoleIdx = profile ? ROLE_ORDER.indexOf(profile.role) : -1
  const visibleModules = NAV_MODULES.filter((m) => {
    const cfg = navConfig?.[m.code]
    if (cfg && !cfg.isEnabled) return false
    if (cfg?.minRole && myRoleIdx < ROLE_ORDER.indexOf(cfg.minRole)) return false
    return true
  }).sort((a, b) => (navConfig?.[a.code]?.order ?? 0) - (navConfig?.[b.code]?.order ?? 0))

  return (
    <>
      <Link
        to="/service-desk"
        onClick={onNavigate}
        className={cn('flex items-center gap-2.5 pt-5 pb-4 hover:opacity-80 transition-opacity', collapsed ? 'px-0 justify-center' : 'px-5')}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-dim flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="white">
            <path d="M12 2 L14.5 8.5 L21 9 L16 13.5 L17.5 20 L12 16.5 L6.5 20 L8 13.5 L3 9 L9.5 8.5 Z" />
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div className="font-display font-bold text-[17px] tracking-tight leading-none">HelpFix</div>
            <div className="text-[11px] text-[var(--text-faint)] mt-0.5">
              {t({ tr: 'Yönetim Paneli', en: 'Admin Panel', fr: "Panneau d'administration", it: 'Pannello di amministrazione', ar: 'لوحة الإدارة' })}
            </div>
          </div>
        )}
      </Link>

      <nav className={cn('flex-1 overflow-y-auto overflow-x-hidden py-1', collapsed ? 'px-2' : 'px-3')}>
        {visibleModules.map((mod) => {
          const cfg = navConfig?.[mod.code]
          const Icon = (cfg?.customIcon && ICON_MAP[cfg.customIcon]) || mod.icon
          const displayName = cfg?.customName?.[lang] || pickLang(mod.name, lang)
          const count = badgeCounts?.[mod.code] ?? 0
          return (
            <NavLink
              key={mod.code}
              to={mod.path}
              onClick={onNavigate}
              title={collapsed ? displayName : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 py-2 rounded-lg text-[13.5px] font-medium mb-0.5 transition-colors relative',
                  collapsed ? 'px-2 justify-center' : 'px-2.5',
                  isActive
                    ? 'bg-brand text-white font-semibold'
                    : 'text-[var(--text-sub)] hover:bg-[var(--row-hover)] hover:text-[var(--text)]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
                      style={{ background: 'var(--color-accent)' }}
                    />
                  )}
                  <Icon className="w-[17px] h-[17px] shrink-0" />
                  {collapsed && count > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-p1 border border-[var(--panel)]" />
                  )}
                  {!collapsed && (
                    <>
                      <span>{displayName}</span>
                      {count > 0 && (
                        <span className="ml-auto text-[9.5px] font-bold bg-p1 text-white rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                      {mod.badge === 'beta' && count === 0 && (
                        <span className="ml-auto text-[9px] font-mono font-bold bg-purple-tint text-purple rounded-full px-1.5 py-0.5">
                          BETA
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
          )
        })}

        {profile?.role === 'tenant_admin' && (
          <>
            <div className={cn('h-px bg-[var(--border)] my-2', collapsed ? 'mx-0.5' : 'mx-1')} />
            <NavLink
              to="/admin"
              onClick={onNavigate}
              title={collapsed ? t({ tr: 'Yönetim Paneli', en: 'Admin Panel', fr: "Panneau d'administration", it: 'Pannello di amministrazione', ar: 'لوحة الإدارة' }) : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 py-2 rounded-lg text-[13.5px] font-medium mb-0.5 transition-colors relative',
                  collapsed ? 'px-2 justify-center' : 'px-2.5',
                  isActive
                    ? 'bg-brand text-white font-semibold'
                    : 'text-[var(--text-sub)] hover:bg-[var(--row-hover)] hover:text-[var(--text)]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
                      style={{ background: 'var(--color-accent)' }}
                    />
                  )}
                  <Settings className="w-[17px] h-[17px] shrink-0" />
                  {!collapsed && <span>{t({ tr: 'Yönetim Paneli', en: 'Admin Panel', fr: "Panneau d'administration", it: 'Pannello di amministrazione', ar: 'لوحة الإدارة' })}</span>}
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      <PoweredByFooter collapsed={collapsed} />
    </>
  )
}

/** Masaüstü/tablet (lg+): daraltılabilir sabit sidebar. Durum
 * localStorage'da tutulur (bkz. useSidebarCollapsed), sayfa
 * yenilense de hatırlanır — modern admin panellerindeki standart
 * davranış. */
export function Sidebar({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  const { t } = useLang()
  return (
    <aside
      className={cn(
        'hidden lg:flex shrink-0 h-screen sticky top-0 flex-col bg-[var(--panel)] border-r border-[var(--border)] transition-[width] duration-200 relative',
        collapsed ? 'w-[72px]' : 'w-[248px]'
      )}
    >
      <SidebarContent collapsed={collapsed} />
      <button
        onClick={onToggleCollapse}
        title={collapsed ? t({ tr: 'Genişlet', en: 'Expand' }) : t({ tr: 'Daralt', en: 'Collapse' })}
        aria-label={collapsed ? t({ tr: 'Genişlet', en: 'Expand' }) : t({ tr: 'Daralt', en: 'Collapse' })}
        aria-pressed={collapsed}
        className="absolute top-[72px] -right-3 w-6 h-6 rounded-full bg-[var(--panel)] border border-[var(--border)] shadow-md flex items-center justify-center text-[var(--text-faint)] hover:text-brand-dim hover:border-brand/40 transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  )
}

/** Mobil (< lg): hamburger ile açılan slide-over drawer. */
export function MobileSidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang()
  if (!open) return null
  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <aside className="relative w-[248px] max-w-[80vw] h-full flex flex-col bg-[var(--panel)] border-r border-[var(--border)] shadow-2xl">
        <button
          onClick={onClose}
          title={t({ tr: 'Kapat', en: 'Close' })}
          aria-label={t({ tr: 'Kapat', en: 'Close' })}
          className="absolute top-4 right-3 w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text)]"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  )
}
