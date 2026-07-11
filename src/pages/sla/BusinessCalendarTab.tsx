import { useState } from 'react'
import { Plus, Trash2, Clock } from 'lucide-react'
import { useLang, pickLang} from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import {
  useBusinessHours,
  useSetBusinessDay,
  useCloseBusinessDay,
  useHolidays,
  useCreateHoliday,
  useDeleteHoliday,
} from './useSla'
import { useSites } from '@/pages/admin/useSites'

const DAY_LABEL: Record<number, { tr: string; en: string }> = {
  0: { tr: 'Pazar', en: 'Sunday' },
  1: { tr: 'Pazartesi', en: 'Monday' },
  2: { tr: 'Salı', en: 'Tuesday' },
  3: { tr: 'Çarşamba', en: 'Wednesday' },
  4: { tr: 'Perşembe', en: 'Thursday' },
  5: { tr: 'Cuma', en: 'Friday' },
  6: { tr: 'Cumartesi', en: 'Saturday' },
}
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Pazartesi ile başla

export function BusinessCalendarTab() {
  const { lang, t } = useLang()
  const { data: sites } = useSites()
  const [siteId, setSiteId] = useState<string | null>(null)
  const { data: hours, isLoading: hoursLoading } = useBusinessHours(siteId)
  const setDay = useSetBusinessDay()
  const closeDay = useCloseBusinessDay()

  const { data: holidays, isLoading: holidaysLoading } = useHolidays()
  const createHoliday = useCreateHoliday()
  const deleteHoliday = useDeleteHoliday()

  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayName, setNewHolidayName] = useState('')

  function hourFor(day: number) {
    return hours?.find((h) => h.day_of_week === day)
  }

  function addHoliday() {
    if (!newHolidayDate || !newHolidayName.trim()) return
    createHoliday.mutate({ date: newHolidayDate, name: newHolidayName.trim() })
    setNewHolidayDate('')
    setNewHolidayName('')
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Haftalık mesai saatleri */}
      <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-brand-dim" />
          <h3 className="font-display text-[15px] font-bold">{t({ tr: 'Haftalık Mesai Saatleri', en: 'Weekly Business Hours' })}</h3>
        </div>
        {!!sites?.length && (
          <select
            value={siteId ?? ''}
            onChange={(e) => setSiteId(e.target.value || null)}
            className="text-[11.5px] font-semibold bg-[var(--panel-2)] border border-[var(--border)] rounded-md px-2 py-1.5 mb-2.5"
          >
            <option value="">{t({ tr: 'Tüm Siteler (varsayılan)', en: 'All Sites (default)' })}</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <p className="text-[11.5px] text-[var(--text-faint)] mb-3.5">
          {t({
            tr: '"Sadece mesai saatlerinde say" işaretli SLA politikaları bu takvimi baz alır. Kapalı işaretli günlerde ve mesai dışı saatlerde SLA sayacı durur.',
            en: 'SLA policies marked "business hours only" use this calendar. The SLA countdown pauses on closed days and outside these hours.',
          })}
        </p>
        {hoursLoading && <div className="text-[12px] text-[var(--text-faint)] py-4 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>}
        <div className="space-y-1.5">
          {DAY_ORDER.map((day) => {
            const row = hourFor(day)
            const isOpen = !!row
            return (
              <div key={day} className="flex items-center gap-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2">
                <button
                  onClick={() => (isOpen ? closeDay.mutate({ dayOfWeek: day, siteId }) : setDay.mutate({ dayOfWeek: day, startTime: '09:00', endTime: '18:00', siteId }))}
                  className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${isOpen ? 'bg-ok' : 'bg-[var(--border)]'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isOpen ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
                <span className="text-[12.5px] font-semibold w-24 shrink-0">{pickLang(DAY_LABEL[day], lang)}</span>
                {isOpen ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="time"
                      value={row.start_time.slice(0, 5)}
                      onChange={(e) => setDay.mutate({ dayOfWeek: day, startTime: e.target.value, endTime: row.end_time.slice(0, 5), siteId })}
                      className="bg-[var(--panel)] border border-[var(--border)] rounded-md px-2 py-1 text-[12px]"
                    />
                    <span className="text-[var(--text-faint)]">–</span>
                    <input
                      type="time"
                      value={row.end_time.slice(0, 5)}
                      onChange={(e) => setDay.mutate({ dayOfWeek: day, startTime: row.start_time.slice(0, 5), endTime: e.target.value, siteId })}
                      className="bg-[var(--panel)] border border-[var(--border)] rounded-md px-2 py-1 text-[12px]"
                    />
                  </div>
                ) : (
                  <span className="text-[11.5px] text-[var(--text-faint)] italic flex-1">{t({ tr: 'Kapalı', en: 'Closed' })}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tatil günleri */}
      <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
        <h3 className="font-display text-[15px] font-bold mb-1">{t({ tr: 'Tatil Günleri', en: 'Holidays' })}</h3>
        <p className="text-[11.5px] text-[var(--text-faint)] mb-3.5">
          {t({
            tr: 'Resmi ve dini bayramlar. Dini bayramlar (Ramazan/Kurban) yıldan yıla Hicri takvime göre kaydığı için Diyanet takviminden bakıp elle eklemeniz gerekir.',
            en: 'Public and religious holidays. Religious holidays shift yearly per the Hijri calendar, so add them manually from the Diyanet calendar.',
          })}
        </p>
        <div className="flex gap-1.5 mb-3.5">
          <input
            type="date"
            value={newHolidayDate}
            onChange={(e) => setNewHolidayDate(e.target.value)}
            className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px] w-[136px] shrink-0"
          />
          <input
            value={newHolidayName}
            onChange={(e) => setNewHolidayName(e.target.value)}
            placeholder={t({ tr: 'örn. Ramazan Bayramı', en: 'e.g. Eid al-Fitr' })}
            className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12.5px] outline-none focus:border-brand"
          />
          <Button onClick={addHoliday} disabled={createHoliday.isPending || !newHolidayDate || !newHolidayName.trim()}>
            <Plus className="w-[15px] h-[15px]" />
          </Button>
        </div>
        {holidaysLoading && <div className="text-[12px] text-[var(--text-faint)] py-4 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>}
        {!holidaysLoading && holidays?.length === 0 && (
          <div className="text-[12px] text-[var(--text-faint)] italic py-6 text-center">{t({ tr: 'Henüz tatil günü eklenmedi.', en: 'No holidays added yet.' })}</div>
        )}
        <div className="space-y-1 max-h-[320px] overflow-y-auto">
          {holidays?.map((h) => (
            <div key={h.id} className="group flex items-center justify-between bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2">
              <div>
                <span className="text-[12.5px] font-semibold">{h.name}</span>
                <span className="ml-2 text-[11px] font-mono text-[var(--text-faint)]">
                  {new Date(h.holiday_date + 'T00:00:00').toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <button
                onClick={() => deleteHoliday.mutate(h.id)}
                className="opacity-0 group-hover:opacity-100 text-[var(--text-faint)] hover:text-p1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
