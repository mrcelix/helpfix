import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useLang } from '@/contexts/LangContext'
import { useFreezeWindows, useCreateFreezeWindow, useDeleteFreezeWindow } from './useChanges'

export function FreezeWindowsModal({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLang()
  const { data: windows, isLoading } = useFreezeWindows()
  const createWindow = useCreateFreezeWindow()
  const deleteWindow = useDeleteFreezeWindow()

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  async function handleAdd() {
    if (!name.trim() || !startDate || !endDate) return
    await createWindow.mutateAsync({
      name: name.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      reason: reason.trim(),
    })
    setName('')
    setStartDate('')
    setEndDate('')
    setReason('')
  }

  return (
    <Modal open onClose={onClose} title={t({ tr: 'Dondurma Pencereleri', en: 'Freeze Windows' })} widthClass="max-w-[560px]">
      <p className="text-[12px] text-[var(--text-faint)] mb-4">
        {t({
          tr: 'Bu tarih aralıklarında değişiklik planlamaya çalışan kullanıcılar bir uyarı görür (örn. yıl sonu, kritik satış dönemleri).',
          en: 'Users scheduling a change within these date ranges see a warning (e.g. year-end, critical sales periods).',
        })}
      </p>

      <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3 mb-4 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t({ tr: 'Pencere adı (örn. Yıl Sonu Dondurması)', en: 'Window name (e.g. Year-End Freeze)' })}
          className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
        />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]" />
        </div>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t({ tr: 'Sebep (opsiyonel)', en: 'Reason (optional)' })}
          className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
        />
        <button onClick={handleAdd} className="w-full py-2 rounded-lg bg-brand text-white text-[12.5px] font-bold">
          {t({ tr: 'Pencere Ekle', en: 'Add Window' })}
        </button>
      </div>

      {isLoading && <p className="text-[var(--text-faint)] text-sm text-center py-4">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}
      <div className="space-y-2">
        {windows?.map((w) => (
          <div key={w.id} className="flex items-center justify-between bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5">
            <div>
              <div className="text-[12.5px] font-bold">{w.name}</div>
              <div className="text-[11px] text-[var(--text-faint)]">
                {new Date(w.start_date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')} –{' '}
                {new Date(w.end_date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                {w.reason && ` · ${w.reason}`}
              </div>
            </div>
            <button
              onClick={() => deleteWindow.mutate(w.id)}
              title={t({ tr: 'Pencereyi sil', en: 'Delete window' })}
              aria-label={t({ tr: 'Pencereyi sil', en: 'Delete window' })}
              className="text-[var(--text-faint)] hover:text-p1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
