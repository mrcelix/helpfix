import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, AlertTriangle } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useWallboardIncidents, useWallboardMajorIncidents } from './useWallboard'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'

export function WallboardPage() {
  const { lang, t } = useLang()
  const navigate = useNavigate()
  const { dataUpdatedAt } = useWallboardIncidents()
  const { data: majorIncidents } = useWallboardMajorIncidents()

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-app text-[var(--text)] p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-tight">
            {t({ tr: 'Servis Masası — Canlı Pano', en: 'Service Desk — Live Wallboard' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-0.5">
            {now.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', day: '2-digit', month: 'long' })} ·{' '}
            {now.toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US')}
          </p>
        </div>
        <button
          onClick={() => navigate('/service-desk')}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border)] text-[var(--text-faint)] hover:text-p1 hover:border-p1 transition-colors"
          title={t({ tr: 'Panodan çık', en: 'Exit wallboard' })}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!!majorIncidents?.length && (
        <div className="bg-p1-tint border-2 border-p1 rounded-2xl px-6 py-4 flex items-center gap-4 animate-pulse">
          <AlertTriangle className="w-7 h-7 text-p1 shrink-0" />
          <div>
            <div className="text-[15px] font-bold text-p1">
              {t({ tr: 'BÜYÜK OLAY AKTİF', en: 'MAJOR INCIDENT ACTIVE' })} ({majorIncidents.length})
            </div>
            <div className="text-[13px] text-[var(--text-sub)] mt-0.5">
              {majorIncidents.map((m) => `${m.ref} — ${m.title}`).join('  ·  ')}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <DashboardGrid surface="wallboard" />
      </div>

      <div className="text-center text-[11px] text-[var(--text-faint)]">
        {t({ tr: 'Son güncelleme: ', en: 'Last updated: ' })}
        {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US') : '—'}
        {' · '}
        {t({ tr: '20 saniyede bir otomatik yenilenir', en: 'Auto-refreshes every 20 seconds' })}
      </div>
    </div>
  )
}
