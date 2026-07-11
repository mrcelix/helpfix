import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useLang, pickLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { useProjects } from './useProjects'
import { ProjectDrawer } from './ProjectDrawer'
import { NewProjectModal } from './NewProjectModal'
import { ResourceHeatmap } from './ResourceHeatmap'

const HEALTH_COLOR: Record<string, string> = {
  green: 'bg-ok',
  amber: 'bg-p2',
  red: 'bg-p1',
}

const STATUS_LABEL: Record<string, { tr: string; en: string }> = {
  planning: { tr: 'Planlama', en: 'Planning' },
  active: { tr: 'Aktif', en: 'Active' },
  on_hold: { tr: 'Beklemede', en: 'On Hold' },
  completed: { tr: 'Tamamlandı', en: 'Completed' },
  cancelled: { tr: 'İptal Edildi', en: 'Cancelled' },
}

export function ProjectsPage() {
  const { lang, t } = useLang()
  const [tab, setTab] = useState<'projects' | 'capacity'>('projects')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const { data: projects, isLoading, error } = useProjects()

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {t({ tr: 'Proje Yönetimi', en: 'Project Management' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Portföy sağlığı, görevler ve risk kaydı', en: 'Portfolio health, tasks, and risk register' })}
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="w-[15px] h-[15px]" />
          {t({ tr: 'Yeni Proje', en: 'New Project' })}
        </Button>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] mb-5 overflow-x-auto">
        <button
          onClick={() => setTab('projects')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${tab === 'projects' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Projeler', en: 'Projects' })}
        </button>
        <button
          onClick={() => setTab('capacity')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${tab === 'capacity' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Kaynak Kapasitesi', en: 'Resource Capacity' })}
        </button>
      </div>

      {tab === 'capacity' ? (
        <ResourceHeatmap />
      ) : (
      <>
      {isLoading && <p className="text-[var(--text-faint)] text-sm py-8 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}
      {error && <p className="text-p1 text-sm py-8 text-center">{t({ tr: 'Bir hata oluştu.', en: 'Something went wrong.' })}</p>}
      {!isLoading && !error && projects?.length === 0 && (
        <p className="text-[var(--text-faint)] text-sm py-14 text-center">{t({ tr: 'Henüz proje yok.', en: 'No projects yet.' })}</p>
      )}

      <div className="grid grid-cols-3 gap-3.5">
        {projects?.map((p) => (
          <div
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 cursor-pointer hover:border-brand transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${HEALTH_COLOR[p.health]}`} />
              <span className="font-bold text-[13.5px]">{p.name}</span>
            </div>
            <div className="text-[11px] text-[var(--text-faint)] mb-3">{(STATUS_LABEL[p.status] ? pickLang(STATUS_LABEL[p.status], lang) : undefined)}</div>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-faint)]">
              <span>{p.owner?.full_name ?? '—'}</span>
              {p.end_date && <span>{new Date(p.end_date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>}
            </div>
          </div>
        ))}
      </div>
      </>
      )}

      {selectedId && <ProjectDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
      {showNewModal && <NewProjectModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}
