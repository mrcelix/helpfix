import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/Login'
import { ComingSoonPage } from '@/pages/ComingSoon'
import { NAV_MODULES } from '@/components/layout/nav-modules'
import { ServiceDeskPage } from '@/pages/service-desk/ServiceDeskPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/service-desk" replace />} />
          {NAV_MODULES.map((mod) => (
            <Route
              key={mod.code}
              path={mod.path}
              element={
                mod.code === 'service-desk' ? <ServiceDeskPage /> : <ComingSoonPage moduleName={mod.name} />
              }
              handle={{ crumb: mod.name }}
            />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
