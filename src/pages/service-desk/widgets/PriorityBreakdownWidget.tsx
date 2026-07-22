import { useLang, pickLang } from '@/contexts/LangContext'
import { PRIORITY_LABEL } from '@/lib/priority'
import { useWallboardIncidents } from '../useWallboard'
import type { Priority } from '@/types/database'

const PRIORITY_ACCENT: Record<Priority, string> = {
  P1: 'text-p1',
  P2: 'text-p2',
  P3: 'text-[#8CA3FF]',
  P4: 'text-p4',
}

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4']

export function PriorityBreakdownWidget() {
  const { lang, t } = useLang()
  const { data: incidents } = useWallboardIncidents()

  const counts = PRIORITIES.reduce(
    (acc, p) => {
      acc[p] = incidents?.filter((i) => i.priority === p).length ?? 0
      return acc
    },
    {} as Record<Priority, number>
  )

  return (
    <div className="h-full grid grid-cols-5 gap-4">
      {PRIORITIES.map((p) => (
        <div key={p} className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 text-center flex flex-col justify-center">
          <div className={`font-display text-5xl font-bold ${PRIORITY_ACCENT[p]}`}>{counts[p]}</div>
          <div className="text-[13px] text-[var(--text-faint)] mt-2 font-semibold">{pickLang(PRIORITY_LABEL[p], lang)}</div>
        </div>
      ))}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 text-center flex flex-col justify-center">
        <div className="font-display text-5xl font-bold">{incidents?.length ?? 0}</div>
        <div className="text-[13px] text-[var(--text-faint)] mt-2 font-semibold">{t({ tr: 'Toplam Açık', en: 'Total Open' })}</div>
      </div>
    </div>
  )
}
