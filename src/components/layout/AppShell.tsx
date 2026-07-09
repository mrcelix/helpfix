import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, MobileSidebarDrawer } from './Sidebar'
import { Topbar } from './Topbar'
import { useLang } from '@/contexts/LangContext'
import { NAV_MODULES } from './nav-modules'
import { CommandPalette } from '@/components/command-palette/CommandPalette'

export function AppShell() {
  const location = useLocation()
  const { lang } = useLang()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // useMatches() veri yönlendiricisi (createBrowserRouter) gerektirir;
  // biz <BrowserRouter> kullandığımız için mevcut path'i doğrudan
  // NAV_MODULES listesiyle eşleştiriyoruz — daha basit ve bağımlılıksız.
  const activeModule = NAV_MODULES.find((m) => location.pathname.startsWith(m.path))
  const crumb = activeModule?.name[lang] ?? ''

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[248px_1fr] min-h-screen">
      <Sidebar />
      <MobileSidebarDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-col min-h-screen">
        <Topbar crumb={crumb} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-5 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
