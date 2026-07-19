import { lazy, Suspense, useState, type ComponentType } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmployeeShell } from '@/components/employee-layout/EmployeeShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/Login'
import { PanelChooserPage } from '@/pages/PanelChooser'
import { ComingSoonPage } from '@/pages/ComingSoon'
import { ConfigMissingPage } from '@/pages/ConfigMissing'
import { NAV_MODULES } from '@/components/layout/nav-modules'
import { useFeatureFlags } from '@/pages/admin/useAdmin'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { useTenantBrandingSync } from '@/components/layout/useTenantBranding'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getPanelFromUrl, getStoredPanelChoice, type PanelChoice } from '@/lib/panelPreference'

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
const PurchasingPage = lazy(() => import('@/pages/purchasing/PurchasingPage').then((m) => ({ default: m.PurchasingPage })))
const StorePerformancePage = lazy(() => import('@/pages/store-performance/StorePerformancePage').then((m) => ({ default: m.StorePerformancePage })))
const AdminPage = lazy(() => import('@/pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })))
const EmployeeHomePage = lazy(() => import('@/pages/employee-center/EmployeeHomePage').then((m) => ({ default: m.EmployeeHomePage })))
const MyTicketsPage = lazy(() => import('@/pages/employee-center/MyTicketsPage').then((m) => ({ default: m.MyTicketsPage })))
const MyAssetsPage = lazy(() => import('@/pages/employee-center/MyAssetsPage').then((m) => ({ default: m.MyAssetsPage })))
const MyStorePage = lazy(() => import('@/pages/employee-center/MyStorePage').then((m) => ({ default: m.MyStorePage })))

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
  purchasing: PurchasingPage,
  'store-performance': StorePerformancePage,
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

/** Çalışan Merkezi route ağacı (requester rolü HER ZAMAN, diğer roller
 * ise panel seçiminde "Çalışan Merkezi"ni seçtiyse burayı görür). */
function EmployeeCenterRoutes() {
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
          <Route path="/my-store" element={<MyStorePage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

/** Yönetim & Servis Masası paneli route ağacı — 14 modüllü agent/admin
 * arayüzü. */
function AgentPanelRoutes() {
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

/** requester rolü Çalışan Merkezi'nden başka bir şey görmez. Diğer
 * roller (agent/manager/tenant_admin) hem Yönetim & Servis Masası
 * panelinin hem Çalışan Merkezi'nin (kendi talepleri için) yetkisine
 * sahiptir — hangisine gireceklerini bir kez seçerler (istenirse
 * hatırlanır), ikisini de ayrı sekmelerde aynı anda açabilirler. */
function RoleBasedShell() {
  const { profile, loading, profileError, signOut } = useAuth()
  const { t } = useLang()
  const [panelOverride, setPanelOverride] = useState<PanelChoice | null>(null)

  // Giriş yapan kullanıcının tenant'ının varsayılan markasını uygula
  // (kişisel override yoksa). Tüm paneller bu shell'den geçtiği için tek yer yeterli.
  useTenantBrandingSync()

  if (loading) return null

  if (profileError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[var(--bg)] text-center px-6">
        <p className="text-[13px] text-[var(--text-faint)] max-w-sm">
          {t({ tr: 'Profil bilgileri yüklenemedi. Lütfen tekrar deneyin.', en: 'Failed to load your profile. Please try again.' })}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="text-[12.5px] font-bold px-3.5 py-2 rounded-lg bg-brand text-white"
          >
            {t({ tr: 'Yeniden Dene', en: 'Retry' })}
          </button>
          <button
            onClick={() => signOut()}
            className="text-[12.5px] font-bold px-3.5 py-2 rounded-lg border border-[var(--border)] text-[var(--text-sub)]"
          >
            {t({ tr: 'Çıkış Yap', en: 'Sign Out' })}
          </button>
        </div>
      </div>
    )
  }

  if (!profile) return null

  if (profile.role === 'requester') {
    return <EmployeeCenterRoutes />
  }

  const activePanel = panelOverride ?? getPanelFromUrl() ?? getStoredPanelChoice()

  if (!activePanel) {
    return <PanelChooserPage onChoose={setPanelOverride} />
  }

  return activePanel === 'employee' ? <EmployeeCenterRoutes /> : <AgentPanelRoutes />
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
