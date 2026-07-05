import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateProject } from './useProjects'

export function NewProjectModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const createProject = useCreateProject()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  async function handleSubmit() {
    if (!name.trim()) return
    await createProject.mutateAsync({
      name: name.trim(),
      description: description.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Proje', en: 'New Project' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createProject.isPending || !name.trim()}>
            {createProject.isPending ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' }) : t({ tr: 'Projeyi Oluştur', en: 'Create Project' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Proje Adı', en: 'Project Name' })}
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Açıklama', en: 'Description' })}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Başlangıç', en: 'Start Date' })}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Bitiş', en: 'End Date' })}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
