import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useLang } from '@/contexts/LangContext'
import { NAV_MODULES } from './nav-modules'
import { CommandPalette } from '@/components/command-palette/CommandPalette'

export function AppShell() {
  const location = useLocation()
  const { lang } = useLang()

  // useMatches() veri yönlendiricisi (createBrowserRouter) gerektirir;
  // biz <BrowserRouter> kullandığımız için mevcut path'i doğrudan
  // NAV_MODULES listesiyle eşleştiriyoruz — daha basit ve bağımlılıksız.
  const activeModule = NAV_MODULES.find((m) => location.pathname.startsWith(m.path))
  const crumb = activeModule?.name[lang] ?? ''

  return (
    <div className="grid grid-cols-[248px_1fr] min-h-screen">
      <Sidebar />
      <div className="flex flex-col min-h-screen">
        <Topbar crumb={crumb} />
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
