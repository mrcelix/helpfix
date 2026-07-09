import { lazy, Suspense, type ComponentType } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmployeeShell } from '@/components/employee-layout/EmployeeShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/Login'
import { ComingSoonPage } from '@/pages/ComingSoon'
import { ConfigMissingPage } from '@/pages/ConfigMissing'
import { NAV_MODULES } from '@/components/layout/nav-modules'
import { useFeatureFlags } from '@/pages/admin/useAdmin'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'

// Performans cilalaması: her sayfa ayrı bir chunk olarak lazy-load
// edilir — ilk yüklemede tek dev bir bundle yerine sadece o an
// görüntülenen modülün kodu indirilir. Route değişince Suspense
// fallback'i kısa süreliğine görünür.
const ServiceDeskPage = lazy(() => import('@/pages/service-desk/ServiceDeskPage').then((m) => ({ default: m.ServiceDeskPage })))
const WallboardPage = lazy(() => import('@/pages/service-desk/WallboardPage').then((m) => ({ default: m.WallboardPage })))
const ProblemsPage = lazy(() => import('@/pages/problems/ProblemsPage').then((m) => ({ default: m.ProblemsPage })))
const ChangesPage = lazy(() => import('@/pages/changes/ChangesPage').then((m) => ({ default: m.ChangesPage })))
const CatalogPage = lazy(() => import('@/pages/catalog/CatalogPage').then((m) => ({ default: m.CatalogPage })))
const CmdbPage = lazy(() => import('@/pages/cmdb/CmdbPage').then((m) => ({ default: m.CmdbPage })))
const KnowledgeBasePage = lazy(() => import('@/pages/knowledge-base/KnowledgeBasePage').then((m) => ({ default: m.KnowledgeBasePage })))
const SlaPage = lazy(() => import('@/pages/sla/SlaPage').then((m) => ({ default: m.SlaPage })))
const ProjectsPage = lazy(() => import('@/pages/projects/ProjectsPage').then((m) => ({ default: m.ProjectsPage })))
const AnalyticsPage = lazy(() => import('@/pages/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const MonitoringPage = lazy(() => import('@/pages/monitoring/MonitoringPage').then((m) => ({ default: m.MonitoringPage })))
const OnCallPage = lazy(() => import('@/pages/oncall/OnCallPage').then((m) => ({ default: m.OnCallPage })))
const AutomationPage = lazy(() => import('@/pages/automation/AutomationPage').then((m) => ({ default: m.AutomationPage })))
const AdminPage = lazy(() => import('@/pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })))
const EmployeeHomePage = lazy(() => import('@/pages/employee-center/EmployeeHomePage').then((m) => ({ default: m.EmployeeHomePage })))
const MyTicketsPage = lazy(() => import('@/pages/employee-center/MyTicketsPage').then((m) => ({ default: m.MyTicketsPage })))
const MyAssetsPage = lazy(() => import('@/pages/employee-center/MyAssetsPage').then((m) => ({ default: m.MyAssetsPage })))

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

function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-6 h-6 text-[var(--text-faint)] animate-spin" />
    </div>
  )
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
      <Suspense fallback={<RouteLoadingFallback />}>
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
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
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
    </Suspense>
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
