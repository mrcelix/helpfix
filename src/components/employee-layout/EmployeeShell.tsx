import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, Ticket, LayoutGrid, BookOpen, Monitor } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { Topbar } from '@/components/layout/Topbar'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { ChatWidget } from '@/pages/employee-center/ChatWidget'
import { cn } from '@/lib/utils'

const EMPLOYEE_NAV = [
  { path: '/home', icon: Home, name: { tr: 'Ana Sayfa', en: 'Home' } },
  { path: '/my-tickets', icon: Ticket, name: { tr: 'Taleplerim', en: 'My Tickets' } },
  { path: '/catalog', icon: LayoutGrid, name: { tr: 'Servis Kataloğu', en: 'Service Catalog' } },
  { path: '/knowledge-base', icon: BookOpen, name: { tr: 'Bilgi Bankası', en: 'Knowledge Base' } },
  { path: '/my-assets', icon: Monitor, name: { tr: 'Varlıklarım', en: 'My Assets' } },
]

export function EmployeeShell() {
  const { lang, t } = useLang()
  const { profile } = useAuth()

  const location = useLocation()
  const activeItem = EMPLOYEE_NAV.find((i) => location.pathname.startsWith(i.path))
  const crumb = activeItem?.name[lang] ?? ''

  return (
    // Mobilde (< md) tek kolon + altta sabit tab bar; md ve üzeri klasik
    // sidebar + içerik grid'i.
    <div className="flex flex-col md:grid md:grid-cols-[248px_1fr] min-h-screen">
      <aside className="hidden md:flex w-[248px] shrink-0 h-screen sticky top-0 flex-col bg-[var(--panel)] border-r border-[var(--border)]">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-dim flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="white">
              <path d="M12 2 L14.5 8.5 L21 9 L16 13.5 L17.5 20 L12 16.5 L6.5 20 L8 13.5 L3 9 L9.5 8.5 Z" />
            </svg>
          </div>
          <div>
            <div className="font-display font-bold text-[17px] tracking-tight leading-none">HelpFix</div>
            <div className="text-[11px] text-[var(--text-faint)] mt-0.5">{t({ tr: 'Çalışan Merkezi', en: 'Employee Center' })}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-1">
          {EMPLOYEE_NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
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
                <span>{item.name[lang]}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-3 flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-lg bg-brand text-white flex items-center justify-center text-xs font-bold shrink-0">
            {profile?.avatarInitials ?? profile?.fullName?.slice(0, 2).toUpperCase() ?? '—'}
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold truncate">{profile?.fullName ?? '—'}</div>
            <div className="text-[11px] text-[var(--text-faint)] truncate">{t({ tr: 'Çalışan', en: 'Employee' })}</div>
          </div>
        </div>
      </aside>

      <div className="flex flex-col min-h-screen">
        <Topbar crumb={crumb} />
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobil alt gezinme çubuğu — md ve üzerinde gizli */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--panel)] border-t border-[var(--border)] flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {EMPLOYEE_NAV.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold',
                  isActive ? 'text-brand-dim' : 'text-[var(--text-faint)]'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="truncate max-w-full px-0.5">{item.name[lang]}</span>
            </NavLink>
          )
        })}
      </nav>

      <CommandPalette />
      <ChatWidget />
    </div>
  )
}
