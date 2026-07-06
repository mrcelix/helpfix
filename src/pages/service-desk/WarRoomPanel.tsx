import { useEffect, useState } from 'react'
import { X, Plus, Radio } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useIncidentResponders, useAddResponder, useRemoveResponder } from './useIncidents'
import { useAssignableUsers } from '@/pages/oncall/useOnCall'

function elapsedString(since: string, lang: 'tr' | 'en'): string {
  const ms = Date.now() - new Date(since).getTime()
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return lang === 'tr' ? `${h}sa ${m}dk` : `${h}h ${m}m`
}

export function WarRoomPanel({ incidentId, declaredAt }: { incidentId: string; declaredAt: string | null }) {
  const { lang, t } = useLang()
  const { data: responders } = useIncidentResponders(incidentId)
  const addResponder = useAddResponder(incidentId)
  const removeResponder = useRemoveResponder(incidentId)
  const { data: users } = useAssignableUsers()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [, forceTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-p1-tint border-2 border-p1 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <Radio className="w-4 h-4 text-p1 animate-pulse" />
        <span className="text-[12px] font-bold text-p1 uppercase tracking-wide">
          {t({ tr: 'Büyük Olay War Room', en: 'Major Incident War Room' })}
        </span>
        {declaredAt && (
          <span className="ml-auto text-[11px] font-mono font-bold text-p1">
            {t({ tr: 'Süre:', en: 'Elapsed:' })} {elapsedString(declaredAt, lang)}
          </span>
        )}
      </div>

      <div className="mb-2">
        <div className="text-[10px] font-bold text-[var(--text-faint)] uppercase mb-1.5">
          {t({ tr: 'Müdahale Ekibi', en: 'Responders' })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {responders?.map((r) => (
            <span key={r.user_id} className="flex items-center gap-1.5 text-[11px] font-semibold bg-[var(--panel)] border border-[var(--border)] rounded-full pl-2.5 pr-1.5 py-1">
              {r.full_name}
              <button onClick={() => removeResponder.mutate(r.user_id)}>
                <X className="w-3 h-3 text-[var(--text-faint)] hover:text-p1" />
              </button>
            </span>
          ))}
          {!pickerOpen ? (
            <button
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-1 text-[11px] font-bold text-p1 border border-dashed border-p1/50 rounded-full px-2.5 py-1"
            >
              <Plus className="w-3 h-3" /> {t({ tr: 'Ekle', en: 'Add' })}
            </button>
          ) : (
            <select
              autoFocus
              onChange={(e) => {
                if (e.target.value) addResponder.mutate(e.target.value)
                setPickerOpen(false)
              }}
              className="text-[11px] bg-[var(--panel)] border border-[var(--border)] rounded-full px-2 py-1"
            >
              <option value="">{t({ tr: 'Seçin…', en: 'Select…' })}</option>
              {users?.filter((u) => !responders?.some((r) => r.user_id === u.id)).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  )
}
