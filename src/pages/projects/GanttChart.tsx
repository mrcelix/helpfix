import { useMemo } from 'react'
import { useLang } from '@/contexts/LangContext'
import type { ProjectTask } from './useProjects'

const STATUS_COLOR: Record<string, string> = {
  todo: '#8B95A8',
  in_progress: '#4C6FFF',
  done: '#22C55E',
}

export function GanttChart({ tasks }: { tasks: ProjectTask[] }) {
  const { lang, t } = useLang()

  const dated = tasks.filter((tk) => tk.start_date && tk.due_date)

  const { rangeStart, totalDays } = useMemo(() => {
    if (!dated.length) {
      const today = new Date()
      return { rangeStart: today, rangeEnd: new Date(today.getTime() + 14 * 86_400_000), totalDays: 14 }
    }
    const starts = dated.map((tk) => new Date(tk.start_date!).getTime())
    const ends = dated.map((tk) => new Date(tk.due_date!).getTime())
    const min = new Date(Math.min(...starts))
    const max = new Date(Math.max(...ends))
    // Kenarlara biraz boşluk bırak
    min.setDate(min.getDate() - 1)
    max.setDate(max.getDate() + 1)
    const days = Math.max(1, Math.round((max.getTime() - min.getTime()) / 86_400_000))
    return { rangeStart: min, rangeEnd: max, totalDays: days }
  }, [dated])

  function dayOffset(date: Date) {
    return (date.getTime() - rangeStart.getTime()) / 86_400_000
  }

  const todayOffset = dayOffset(new Date())
  const dayWidth = 100 / totalDays

  // Hafta başlıklarını oluştur
  const weekMarkers: { offset: number; label: string }[] = []
  for (let d = 0; d <= totalDays; d += 7) {
    const date = new Date(rangeStart.getTime() + d * 86_400_000)
    weekMarkers.push({
      offset: d,
      label: date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' }),
    })
  }

  if (!dated.length) {
    return (
      <p className="text-[var(--text-faint)] text-sm py-10 text-center">
        {t({ tr: 'Gantt görünümü için görevlere başlangıç ve bitiş tarihi eklemeniz gerekir.', en: 'Add start and due dates to tasks to see the Gantt view.' })}
      </p>
    )
  }

  return (
    <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3 overflow-x-auto">
      <div style={{ minWidth: 500 }}>
        {/* Hafta başlıkları */}
        <div className="relative h-5 mb-1.5 border-b border-[var(--border)]">
          {weekMarkers.map((w, i) => (
            <span
              key={i}
              className="absolute text-[9.5px] text-[var(--text-faint)] font-mono"
              style={{ left: `${(w.offset / totalDays) * 100}%` }}
            >
              {w.label}
            </span>
          ))}
        </div>

        {/* Görev satırları */}
        <div className="relative space-y-2 pt-1">
          {/* Bugün çizgisi */}
          {todayOffset >= 0 && todayOffset <= totalDays && (
            <div
              className="absolute top-0 bottom-0 w-[1.5px] bg-p1 z-10"
              style={{ left: `${(todayOffset / totalDays) * 100}%` }}
            >
              <span className="absolute -top-4 -translate-x-1/2 text-[8.5px] font-bold text-p1">
                {t({ tr: 'Bugün', en: 'Today' })}
              </span>
            </div>
          )}

          {dated.map((tk) => {
            const start = dayOffset(new Date(tk.start_date!))
            const end = dayOffset(new Date(tk.due_date!)) + 1
            return (
              <div key={tk.id} className="relative h-7">
                <div className="absolute inset-y-0 left-0 text-[10.5px] font-semibold truncate w-full pointer-events-none opacity-0">
                  {tk.title}
                </div>
                <div
                  className="absolute h-6 rounded-md flex items-center px-2 text-[10px] font-bold text-white truncate"
                  style={{
                    left: `${start * dayWidth}%`,
                    width: `${Math.max(end - start, 0.5) * dayWidth}%`,
                    background: STATUS_COLOR[tk.status],
                  }}
                  title={tk.title}
                >
                  {tk.title}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-[var(--border)] text-[10px] text-[var(--text-faint)]">
        {Object.entries(STATUS_COLOR).map(([key, color]) => (
          <span key={key} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {key}
          </span>
        ))}
      </div>
    </div>
  )
}
