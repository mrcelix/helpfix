import { useMemo } from 'react'
import { useLang } from '@/contexts/LangContext'
import { useResourceCapacity } from './useProjects'

function heatColor(count: number) {
  if (count === 0) return 'bg-[var(--panel-2)]'
  if (count <= 2) return 'bg-ok/30'
  if (count <= 4) return 'bg-p2/40'
  return 'bg-p1/50'
}

export function ResourceHeatmap() {
  const { lang, t } = useLang()
  const { data: rows, isLoading } = useResourceCapacity()

  const weekKeys = useMemo(() => {
    const keys: string[] = []
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay())
    for (let i = 0; i < 6; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i * 7)
      keys.push(d.toISOString().slice(0, 10))
    }
    return keys
  }, [])

  if (isLoading) {
    return <p className="text-[var(--text-faint)] text-sm py-10 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
  }

  if (!rows?.length) {
    return (
      <p className="text-[var(--text-faint)] text-sm py-14 text-center">
        {t({ tr: 'Atanmış ve son tarihi olan görev bulunamadı.', en: 'No assigned tasks with due dates found.' })}
      </p>
    )
  }

  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 overflow-x-auto">
      <table className="w-full text-[11.5px]">
        <thead>
          <tr>
            <th className="text-left text-[10px] uppercase text-[var(--text-faint)] font-semibold pb-2 pr-3">
              {t({ tr: 'Kişi', en: 'Person' })}
            </th>
            {weekKeys.map((w) => (
              <th key={w} className="text-center text-[9.5px] text-[var(--text-faint)] font-mono pb-2 px-1">
                {new Date(w).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId}>
              <td className="font-semibold pr-3 py-1 whitespace-nowrap">{r.fullName}</td>
              {weekKeys.map((w) => {
                const count = r.weeks[w] ?? 0
                return (
                  <td key={w} className="px-1 py-1">
                    <div className={`w-full h-8 rounded-md flex items-center justify-center font-bold text-[11px] ${heatColor(count)}`}>
                      {count > 0 ? count : ''}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-[var(--border)] text-[10px] text-[var(--text-faint)]">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-ok/30" />{t({ tr: 'Hafif (1-2)', en: 'Light (1-2)' })}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-p2/40" />{t({ tr: 'Orta (3-4)', en: 'Medium (3-4)' })}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-p1/50" />{t({ tr: 'Yoğun (5+)', en: 'Heavy (5+)' })}</span>
      </div>
    </div>
  )
}
