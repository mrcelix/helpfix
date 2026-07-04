import { Outlet, useMatches } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useLang } from '@/contexts/LangContext'

export function AppShell() {
  const matches = useMatches()
  const { lang } = useLang()

  // En derindeki route'un handle.crumb'ı varsa onu kullan; yoksa boş bırak.
  const current = [...matches].reverse().find((m) => (m.handle as { crumb?: Record<string, string> })?.crumb)
  const crumb = (current?.handle as { crumb?: Record<string, string> })?.crumb?.[lang] ?? ''

  return (
    <div className="grid grid-cols-[248px_1fr] min-h-screen">
      <Sidebar />
      <div className="flex flex-col min-h-screen">
        <Topbar crumb={crumb} />
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
