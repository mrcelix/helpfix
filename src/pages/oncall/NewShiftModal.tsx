import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateShift, useAssignableUsers } from './useOnCall'

export function NewShiftModal({ scheduleId, onClose }: { scheduleId: string; onClose: () => void }) {
  const { t } = useLang()
  const createShift = useCreateShift(scheduleId)
  const { data: users } = useAssignableUsers()

  const [userId, setUserId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  async function handleSubmit() {
    if (!userId || !startTime || !endTime) return
    await createShift.mutateAsync({
      userId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Vardiya', en: 'New Shift' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createShift.isPending || !userId || !startTime || !endTime}>
            {createShift.isPending ? t({ tr: 'Ekleniyor…', en: 'Adding…' }) : t({ tr: 'Vardiyayı Ekle', en: 'Add Shift' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Kullanıcı', en: 'User' })}
          </label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
          >
            <option value="">{t({ tr: 'Seçin…', en: 'Select…' })}</option>
            {users?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Başlangıç', en: 'Start' })}
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Bitiş', en: 'End' })}
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px]"
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
