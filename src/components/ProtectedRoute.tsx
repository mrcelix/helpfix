import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const { t } = useLang()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text-faint)] text-sm">
        {t({ tr: 'Yükleniyor…', en: 'Loading…' })}
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
