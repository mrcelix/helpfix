import { useState } from 'react'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useScheduledChanges, findChangeConflicts, type ScheduledChange } from './useChanges'

const WEEKDAY_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const WEEKDAY_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function riskColor(score: number) {
  if (score >= 60) return 'bg-p1'
  if (score >= 31) return 'bg-p2'
  return 'bg-ok'
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function ChangeCalendarTab({ onOpenChange }: { onOpenChange: (id: string) => void }) {
  const { lang, t } = useLang()
  const { data: changes, isLoading, error } = useScheduledChanges()
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })

  const conflicts = findChangeConflicts(changes ?? [])
  const conflictedIds = new Set(conflicts.flatMap((c) => [c.a.id, c.b.id]))

  const firstOfMonth = new Date(cursor)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(firstOfMonth.getDate() - firstWeekday)

  const days: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })

  function changesOnDay(day: Date): ScheduledChange[] {
    return (changes ?? []).filter((c) => sameDay(new Date(c.scheduled_start), day))
  }

  const monthLabel = cursor.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'long', year: 'numeric' })
  const weekdays = lang === 'tr' ? WEEKDAY_TR : WEEKDAY_EN

  return (
    <div>
      {isLoading && (
        <p className="text-[12px] text-[var(--text-faint)] text-center py-3">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
      )}
      {error && (
        <p className="text-[12px] text-p1 text-center py-3">
          {t({ tr: 'Planlanmış değişiklikler yüklenemedi.', en: 'Failed to load scheduled changes.' })}
        </p>
      )}
      {conflicts.length > 0 && (
        <div className="flex items-start gap-2.5 bg-p1-tint border border-p1/40 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-p1 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-[12.5px] font-bold text-p1 mb-1">
              {t({ tr: `${conflicts.length} çakışma tespit edildi`, en: `${conflicts.length} conflicts detected` })}
            </div>
            <div className="flex flex-col gap-0.5">
              {conflicts.map((c, i) => (
                <div key={i} className="text-[11.5px] text-[var(--text-sub)]">
                  <button onClick={() => onOpenChange(c.a.id)} className="font-semibold hover:underline">
                    {c.a.ref}
                  </button>
                  {' ve '}
                  <button onClick={() => onOpenChange(c.b.id)} className="font-semibold hover:underline">
                    {c.b.ref}
                  </button>
                  {t({
                    tr: ` aynı CI (${c.a.ci?.name}) üzerinde çakışan zaman aralıklarında planlanmış.`,
                    en: ` are scheduled on the same CI (${c.a.ci?.name}) with overlapping time windows.`,
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3.5">
        <span className="font-display text-[16px] font-bold capitalize">{monthLabel}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            title={t({ tr: 'Önceki ay', en: 'Previous month' })}
            aria-label={t({ tr: 'Önceki ay', en: 'Previous month' })}
            className="w-7 h-7 rounded-md flex items-center justify-center border border-[var(--border)] text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCursor(() => { const d = new Date(); d.setDate(1); return d })}
            className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-[var(--border)] text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            {t({ tr: 'Bugün', en: 'Today' })}
          </button>
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            title={t({ tr: 'Sonraki ay', en: 'Next month' })}
            aria-label={t({ tr: 'Sonraki ay', en: 'Next month' })}
            className="w-7 h-7 rounded-md flex items-center justify-center border border-[var(--border)] text-[var(--text-faint)] hover:text-[var(--text)]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border border-[var(--border)] rounded-[var(--radius-app)] overflow-hidden bg-[var(--panel)]">
        {weekdays.map((w) => (
          <div key={w} className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase text-center py-2 border-b border-[var(--border)]">
            {w}
          </div>
        ))}
        {days.map((day, idx) => {
          const inMonth = day.getMonth() === cursor.getMonth()
          const isToday = sameDay(day, new Date())
          const dayChanges = changesOnDay(day)
          return (
            <div
              key={idx}
              className={`min-h-[92px] border-b border-r border-[var(--border)] p-1.5 ${idx % 7 === 6 ? 'border-r-0' : ''} ${!inMonth ? 'bg-[var(--panel-2)]/40' : ''}`}
            >
              <div className={`text-[10.5px] font-bold mb-1 ${isToday ? 'text-brand-dim' : inMonth ? 'text-[var(--text-faint)]' : 'text-[var(--text-faint)]/40'}`}>
                {day.getDate()}
              </div>
              <div className="flex flex-col gap-1">
                {dayChanges.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onOpenChange(c.id)}
                    className={`flex items-center gap-1 text-left text-[9.5px] font-bold text-white rounded px-1.5 py-0.5 truncate ${riskColor(c.risk_score)}`}
                    title={c.title}
                  >
                    {conflictedIds.has(c.id) && <AlertTriangle className="w-2.5 h-2.5 shrink-0" />}
                    <span className="truncate">{c.ref}</span>
                  </button>
                ))}
                {dayChanges.length > 3 && (
                  <span className="text-[9.5px] text-[var(--text-faint)] font-semibold px-1.5">
                    +{dayChanges.length - 3} {t({ tr: 'daha', en: 'more' })}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
