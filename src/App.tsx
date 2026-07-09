import type { ComponentType } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { EmployeeShell } from '@/components/employee-layout/EmployeeShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/Login'
import { ComingSoonPage } from '@/pages/ComingSoon'
import { ConfigMissingPage } from '@/pages/ConfigMissing'
import { NAV_MODULES } from '@/components/layout/nav-modules'
import { ServiceDeskPage } from '@/pages/service-desk/ServiceDeskPage'
import { WallboardPage } from '@/pages/service-desk/WallboardPage'
import { ProblemsPage } from '@/pages/problems/ProblemsPage'
import { ChangesPage } from '@/pages/changes/ChangesPage'
import { CatalogPage } from '@/pages/catalog/CatalogPage'
import { CmdbPage } from '@/pages/cmdb/CmdbPage'
import { KnowledgeBasePage } from '@/pages/knowledge-base/KnowledgeBasePage'
import { SlaPage } from '@/pages/sla/SlaPage'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'
import { MonitoringPage } from '@/pages/monitoring/MonitoringPage'
import { OnCallPage } from '@/pages/oncall/OnCallPage'
import { AutomationPage } from '@/pages/automation/AutomationPage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { EmployeeHomePage } from '@/pages/employee-center/EmployeeHomePage'
import { MyTicketsPage } from '@/pages/employee-center/MyTicketsPage'
import { MyAssetsPage } from '@/pages/employee-center/MyAssetsPage'
import { useFeatureFlags } from '@/pages/admin/useAdmin'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'

const MODULE_PAGES: Record<string, ComponentType> = {
  'service-desk': ServiceDeskPage,
  problems: ProblemsPage,
  changes: ChangesPage,
  catalog: CatalogPage,
  cmdb: CmdbPage,
  'knowledge-base': KnowledgeBasePage,
  sla: SlaPage,
  projects: ProjectsPage,
  analytics: AnalyticsPage,
  monitoring: MonitoringPage,
  'on-call': OnCallPage,
  automation: AutomationPage,
}

/** Bir modül tenant için kapatılmışsa doğrudan URL erişimini de engeller
 * (sadece sidebar'dan gizlemekle kalmaz). */
function ModuleRoute({ moduleCode, children }: { moduleCode: string; children: React.ReactNode }) {
  const { data: flags, isLoading } = useFeatureFlags()
  if (isLoading) return null
  const enabled = flags?.[moduleCode] ?? true
  if (!enabled) return <Navigate to="/service-desk" replace />
  return <>{children}</>
}

/** /admin route'unu sadece tenant_admin rolüne açar. */
function AdminRoute() {
  const { profile } = useAuth()
  if (profile && profile.role !== 'tenant_admin') {
    return <Navigate to="/service-desk" replace />
  }
  return <AdminPage />
}

/** requester rolü tamamen ayrı, basit bir kabuk (Çalışan Merkezi) üzerinden
 * gezinir — 12 modüllü agent arayüzünü hiç görmez. */
function RoleBasedShell() {
  const { profile, loading } = useAuth()
  if (loading || !profile) return null

  if (profile.role === 'requester') {
    return (
      <Routes>
        <Route element={<EmployeeShell />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<EmployeeHomePage />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="/my-assets" element={<MyAssetsPage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/service-desk/wallboard" element={<WallboardPage />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/service-desk" replace />} />
        <Route path="/admin" element={<AdminRoute />} />
        {NAV_MODULES.map((mod) => {
          const Page = MODULE_PAGES[mod.code]
          return (
            <Route
              key={mod.code}
              path={mod.path}
              element={
                <ModuleRoute moduleCode={mod.code}>
                  {Page ? <Page /> : <ComingSoonPage moduleName={mod.name} />}
                </ModuleRoute>
              }
            />
          )
        })}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function App() {
  if (!isSupabaseConfigured) {
    return <ConfigMissingPage />
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<RoleBasedShell />} />
      </Route>
    </Routes>
  )
}

export default App
