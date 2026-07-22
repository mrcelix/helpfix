import { useLang } from '@/contexts/LangContext'
import { useWallboardResolvedToday } from '../useWallboard'

export function ResolvedTodayWidget() {
  const { t } = useLang()
  const { data: resolvedToday } = useWallboardResolvedToday()

  return (
    <div className="h-full bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 text-center flex flex-col justify-center">
      <div className="font-display text-6xl font-bold text-ok">{resolvedToday ?? 0}</div>
      <div className="text-[13px] text-[var(--text-faint)] mt-2 font-semibold">{t({ tr: 'Bugün Çözülen', en: 'Resolved Today' })}</div>
    </div>
  )
}
