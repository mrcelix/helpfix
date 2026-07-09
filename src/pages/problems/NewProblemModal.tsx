import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreateProblem, type ClusterCandidate } from './useProblems'
import { priorityLabel } from '@/lib/priority'
import type { Priority } from '@/types/database'

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4']

export function NewProblemModal({
  onClose,
  prefillCluster,
}: {
  onClose: () => void
  prefillCluster: ClusterCandidate | null
}) {
  const { lang, t } = useLang()
  const createProblem = useCreateProblem()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('P3')
  const [category, setCategory] = useState('')

  useEffect(() => {
    if (prefillCluster) {
      setTitle(
        t({
          tr: `${prefillCluster.category} kategorisinde tekrarlayan sorun`,
          en: `Recurring issue in ${prefillCluster.category}`,
        })
      )
      setCategory(prefillCluster.category)
      setDescription(
        t({
          tr: `AI tarafından tespit edildi: son 7 günde ${prefillCluster.incident_count} benzer olay. Örnekler: ${prefillCluster.sample_titles.join(', ')}`,
          en: `Detected by AI: ${prefillCluster.incident_count} similar incidents in the last 7 days. Examples: ${prefillCluster.sample_titles.join(', ')}`,
        })
      )
      setPriority(prefillCluster.incident_count >= 5 ? 'P2' : 'P3')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillCluster])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await createProblem.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      priority,
      category: category.trim() || null,
      incidentIds: prefillCluster?.sample_incident_ids,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni Problem', en: 'New Problem' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createProblem.isPending || !title.trim()}>
            {createProblem.isPending
              ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' })
              : t({ tr: 'Problemi Oluştur', en: 'Create Problem' })}
          </Button>
        </>
      }
    >
      {prefillCluster && (
        <div className="mb-4 text-[11.5px] bg-purple-tint/50 border border-purple/40 rounded-lg px-3 py-2 text-[var(--text-sub)]">
          {t({
            tr: `${prefillCluster.sample_incident_ids.length} olay otomatik olarak bu probleme bağlanacak.`,
            en: `${prefillCluster.sample_incident_ids.length} incidents will be automatically linked to this problem.`,
          })}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Başlık', en: 'Title' })}
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            rows={4}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Öncelik', en: 'Priority' })}
            </label>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={
                    'flex-1 text-[11.5px] font-bold py-2 rounded-lg border transition-colors ' +
                    (priority === p
                      ? 'bg-p2 border-p2 text-black/80'
                      : 'bg-[var(--panel-2)] border-[var(--border)] text-[var(--text-sub)]')
                  }
                >
                  {priorityLabel(p, lang)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Kategori', en: 'Category' })}
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
