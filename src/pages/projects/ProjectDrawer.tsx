import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { useLang } from '@/contexts/LangContext'
import {
  useProjectDetail,
  useProjectTasks,
  useProjectRisks,
  useUpdateProject,
  useCreateTask,
  useUpdateTaskStatus,
  useCreateRisk,
  type ProjectTask,
} from './useProjects'
import type { ProjectHealth, ProjectStatus, TaskStatus, RiskLevel } from '@/types/database'

const TASK_COLUMNS: { key: TaskStatus; label: { tr: string; en: string } }[] = [
  { key: 'todo', label: { tr: 'Yapılacak', en: 'To Do' } },
  { key: 'in_progress', label: { tr: 'Yapılıyor', en: 'In Progress' } },
  { key: 'done', label: { tr: 'Bitti', en: 'Done' } },
]

const RISK_COLOR: Record<string, string> = { low: 'text-ok', medium: 'text-p2', high: 'text-p1' }

export function ProjectDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useLang()
  const [tab, setTab] = useState<'tasks' | 'risks'>('tasks')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [showRiskForm, setShowRiskForm] = useState(false)
  const [riskTitle, setRiskTitle] = useState('')
  const [riskImpact, setRiskImpact] = useState<RiskLevel>('medium')
  const [riskLikelihood, setRiskLikelihood] = useState<RiskLevel>('medium')

  const { data: project, isLoading } = useProjectDetail(id)
  const { data: tasks } = useProjectTasks(id)
  const { data: risks } = useProjectRisks(id)
  const updateProject = useUpdateProject(id)
  const createTask = useCreateTask(id)
  const updateTaskStatus = useUpdateTaskStatus(id)
  const createRisk = useCreateRisk(id)

  function addTask() {
    if (!newTaskTitle.trim()) return
    createTask.mutate(newTaskTitle.trim())
    setNewTaskTitle('')
  }

  function addRisk() {
    if (!riskTitle.trim()) return
    createRisk.mutate({ title: riskTitle.trim(), description: '', impact: riskImpact, likelihood: riskLikelihood })
    setRiskTitle('')
    setShowRiskForm(false)
  }

  function nextStatus(current: TaskStatus): TaskStatus {
    if (current === 'todo') return 'in_progress'
    if (current === 'in_progress') return 'done'
    return 'todo'
  }

  return (
    <Drawer open onClose={onClose} title={project?.name ?? '…'} widthClass="w-[560px]">
      {isLoading || !project ? (
        <div className="text-[var(--text-faint)] text-sm py-10 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                {t({ tr: 'Durum', en: 'Status' })}
              </label>
              <select
                value={project.status}
                onChange={(e) => updateProject.mutate({ status: e.target.value as ProjectStatus })}
                className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
              >
                <option value="planning">{t({ tr: 'Planlama', en: 'Planning' })}</option>
                <option value="active">{t({ tr: 'Aktif', en: 'Active' })}</option>
                <option value="on_hold">{t({ tr: 'Beklemede', en: 'On Hold' })}</option>
                <option value="completed">{t({ tr: 'Tamamlandı', en: 'Completed' })}</option>
                <option value="cancelled">{t({ tr: 'İptal Edildi', en: 'Cancelled' })}</option>
              </select>
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                {t({ tr: 'Sağlık (RAG)', en: 'Health (RAG)' })}
              </label>
              <div className="flex gap-1.5">
                {(['green', 'amber', 'red'] as ProjectHealth[]).map((h) => (
                  <button
                    key={h}
                    onClick={() => updateProject.mutate({ health: h })}
                    className={`flex-1 h-[34px] rounded-lg border-2 ${project.health === h ? 'border-[var(--text)]' : 'border-transparent'} ${h === 'green' ? 'bg-ok' : h === 'amber' ? 'bg-p2' : 'bg-p1'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {project.description && <p className="text-[13px] text-[var(--text-sub)]">{project.description}</p>}

          <div className="flex gap-1 border-b border-[var(--border)]">
            <button
              onClick={() => setTab('tasks')}
              className={`px-1 py-2 text-[12.5px] font-semibold mr-4 border-b-2 ${tab === 'tasks' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
            >
              {t({ tr: 'Görevler', en: 'Tasks' })}
            </button>
            <button
              onClick={() => setTab('risks')}
              className={`px-1 py-2 text-[12.5px] font-semibold mr-4 border-b-2 ${tab === 'risks' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
            >
              {t({ tr: 'Risk Kaydı', en: 'Risk Register' })}
            </button>
          </div>

          {tab === 'tasks' && (
            <div>
              <div className="flex gap-2 mb-4">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  placeholder={t({ tr: 'Yeni görev ekle…', en: 'Add a new task…' })}
                  className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12.5px]"
                />
                <button onClick={addTask} className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {TASK_COLUMNS.map((col) => (
                  <div key={col.key}>
                    <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase mb-2">{col.label.tr}</div>
                    <div className="space-y-1.5">
                      {tasks
                        ?.filter((tk) => tk.status === col.key)
                        .map((tk: ProjectTask) => (
                          <button
                            key={tk.id}
                            onClick={() => updateTaskStatus.mutate({ taskId: tk.id, status: nextStatus(tk.status) })}
                            className="w-full text-left bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-2.5 text-[11.5px] hover:border-brand"
                          >
                            {tk.title}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'risks' && (
            <div>
              {!showRiskForm ? (
                <button
                  onClick={() => setShowRiskForm(true)}
                  className="w-full mb-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-[12px] font-semibold text-[var(--text-faint)]"
                >
                  + {t({ tr: 'Risk Ekle', en: 'Add Risk' })}
                </button>
              ) : (
                <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3 mb-3 space-y-2">
                  <input
                    autoFocus
                    value={riskTitle}
                    onChange={(e) => setRiskTitle(e.target.value)}
                    placeholder={t({ tr: 'Risk başlığı…', en: 'Risk title…' })}
                    className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
                  />
                  <div className="flex gap-2">
                    <select value={riskImpact} onChange={(e) => setRiskImpact(e.target.value as RiskLevel)} className="flex-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[11.5px]">
                      <option value="low">{t({ tr: 'Etki: Düşük', en: 'Impact: Low' })}</option>
                      <option value="medium">{t({ tr: 'Etki: Orta', en: 'Impact: Medium' })}</option>
                      <option value="high">{t({ tr: 'Etki: Yüksek', en: 'Impact: High' })}</option>
                    </select>
                    <select value={riskLikelihood} onChange={(e) => setRiskLikelihood(e.target.value as RiskLevel)} className="flex-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[11.5px]">
                      <option value="low">{t({ tr: 'Olasılık: Düşük', en: 'Likelihood: Low' })}</option>
                      <option value="medium">{t({ tr: 'Olasılık: Orta', en: 'Likelihood: Medium' })}</option>
                      <option value="high">{t({ tr: 'Olasılık: Yüksek', en: 'Likelihood: High' })}</option>
                    </select>
                  </div>
                  <button onClick={addRisk} className="w-full py-1.5 rounded-lg bg-brand text-white text-[12px] font-bold">
                    {t({ tr: 'Ekle', en: 'Add' })}
                  </button>
                </div>
              )}
              <div className="space-y-1.5">
                {risks?.map((r) => (
                  <div key={r.id} className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold">{r.title}</span>
                      <span className={`text-[10px] font-bold uppercase ${RISK_COLOR[r.impact]}`}>{r.impact}</span>
                    </div>
                  </div>
                ))}
                {!risks?.length && (
                  <p className="text-[11.5px] text-[var(--text-faint)] italic text-center py-4">
                    {t({ tr: 'Henüz risk kaydedilmedi', en: 'No risks logged yet' })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}
