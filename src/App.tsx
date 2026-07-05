import type { ComponentType } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/Login'
import { ComingSoonPage } from '@/pages/ComingSoon'
import { ConfigMissingPage } from '@/pages/ConfigMissing'
import { NAV_MODULES } from '@/components/layout/nav-modules'
import { ServiceDeskPage } from '@/pages/service-desk/ServiceDeskPage'
import { ProblemsPage } from '@/pages/problems/ProblemsPage'
import { ChangesPage } from '@/pages/changes/ChangesPage'
import { CatalogPage } from '@/pages/catalog/CatalogPage'
import { CmdbPage } from '@/pages/cmdb/CmdbPage'
import { KnowledgeBasePage } from '@/pages/knowledge-base/KnowledgeBasePage'
import { isSupabaseConfigured } from '@/lib/supabase'

const MODULE_PAGES: Record<string, ComponentType> = {
  'service-desk': ServiceDeskPage,
  problems: ProblemsPage,
  changes: ChangesPage,
  catalog: CatalogPage,
  cmdb: CmdbPage,
  'knowledge-base': KnowledgeBasePage,
}

function App() {
  if (!isSupabaseConfigured) {
    return <ConfigMissingPage />
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/service-desk" replace />} />
          {NAV_MODULES.map((mod) => {
            const Page = MODULE_PAGES[mod.code]
            return (
              <Route
                key={mod.code}
                path={mod.path}
                element={Page ? <Page /> : <ComingSoonPage moduleName={mod.name} />}
              />
            )
          })}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
