import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useRequestSwap, useAssignableUsers, type Shift } from './useOnCall'

export function SwapRequestModal({ shift, onClose }: { shift: Shift; onClose: () => void }) {
  const { lang, t } = useLang()
  const requestSwap = useRequestSwap()
  const { data: users } = useAssignableUsers()
  const [requestedTo, setRequestedTo] = useState('')

  async function handleSubmit() {
    if (!requestedTo) return
    await requestSwap.mutateAsync({ shiftId: shift.id, requestedTo })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Vardiya Değişim Talebi', en: 'Shift Swap Request' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={requestSwap.isPending || !requestedTo}>
            {requestSwap.isPending ? t({ tr: 'Gönderiliyor…', en: 'Sending…' }) : t({ tr: 'Talep Gönder', en: 'Send Request' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3 text-[12.5px]">
          <div className="font-bold mb-1">{t({ tr: 'Vardiya', en: 'Shift' })}</div>
          <div className="text-[var(--text-faint)]">
            {new Date(shift.start_time).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')} →{' '}
            {new Date(shift.end_time).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Kime devretmek istiyorsunuz?', en: 'Who would you like to swap with?' })}
          </label>
          <select
            value={requestedTo}
            onChange={(e) => setRequestedTo(e.target.value)}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
          >
            <option value="">{t({ tr: 'Seçin…', en: 'Select…' })}</option>
            {users
              ?.filter((u) => u.id !== shift.user?.id)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
          </select>
        </div>
      </div>
    </Modal>
  )
}
