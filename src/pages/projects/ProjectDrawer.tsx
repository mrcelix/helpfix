import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { useLang, pickLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { GanttChart } from './GanttChart'
import { STATUS_LABEL } from './ProjectsPage'
import {
  useProjectDetail,
  useProjectTasks,
  useProjectRisks,
  useUpdateProject,
  useCreateTask,
  useUpdateTaskStatus,
  useCreateRisk,
  useUpdateRiskStatus,
  type ProjectTask,
} from './useProjects'
import type { ProjectHealth, ProjectStatus, TaskStatus, RiskLevel, RiskStatus } from '@/types/database'

const TASK_COLUMNS: { key: TaskStatus; label: { tr: string; en: string } }[] = [
  { key: 'todo', label: { tr: 'Yapılacak', en: 'To Do' } },
  { key: 'in_progress', label: { tr: 'Yapılıyor', en: 'In Progress' } },
  { key: 'done', label: { tr: 'Bitti', en: 'Done' } },
]

const RISK_COLOR: Record<string, string> = { low: 'text-ok', medium: 'text-p2', high: 'text-p1' }
const RISK_LEVEL_LABEL: Record<RiskLevel, { tr: string; en: string }> = {
  low: { tr: 'Düşük', en: 'Low' },
  medium: { tr: 'Orta', en: 'Medium' },
  high: { tr: 'Yüksek', en: 'High' },
}
const RISK_STATUS_LABEL: Record<RiskStatus, { tr: string; en: string }> = {
  open: { tr: 'Açık', en: 'Open' },
  mitigated: { tr: 'Azaltıldı', en: 'Mitigated' },
  closed: { tr: 'Kapandı', en: 'Closed' },
}
const HEALTH_LABEL: Record<ProjectHealth, { tr: string; en: string }> = {
  green: { tr: 'Yeşil — Sağlıklı', en: 'Green — Healthy' },
  amber: { tr: 'Sarı — Riskli', en: 'Amber — At Risk' },
  red: { tr: 'Kırmızı — Kritik', en: 'Red — Critical' },
}

export function ProjectDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const canManage = profile && ['tenant_admin', 'manager', 'agent'].includes(profile.role)
  const [tab, setTab] = useState<'tasks' | 'gantt' | 'risks'>('tasks')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskStart, setNewTaskStart] = useState('')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [showRiskForm, setShowRiskForm] = useState(false)
  const [riskTitle, setRiskTitle] = useState('')
  const [riskDescription, setRiskDescription] = useState('')
  const [riskImpact, setRiskImpact] = useState<RiskLevel>('medium')
  const [riskLikelihood, setRiskLikelihood] = useState<RiskLevel>('medium')

  const { data: project, isLoading, error } = useProjectDetail(id)
  const { data: tasks, error: tasksError } = useProjectTasks(id)
  const { data: risks, error: risksError } = useProjectRisks(id)
  const updateProject = useUpdateProject(id)
  const createTask = useCreateTask(id)
  const updateTaskStatus = useUpdateTaskStatus(id)
  const createRisk = useCreateRisk(id)
  const updateRiskStatus = useUpdateRiskStatus(id)

  function addTask() {
    if (!newTaskTitle.trim()) return
    createTask.mutate({ title: newTaskTitle.trim(), startDate: newTaskStart || null, dueDate: newTaskDue || null })
    setNewTaskTitle('')
    setNewTaskStart('')
    setNewTaskDue('')
  }

  function addRisk() {
    if (!riskTitle.trim()) return
    createRisk.mutate({ title: riskTitle.trim(), description: riskDescription.trim(), impact: riskImpact, likelihood: riskLikelihood })
    setRiskTitle('')
    setRiskDescription('')
    setShowRiskForm(false)
  }

  function nextStatus(current: TaskStatus): TaskStatus {
    if (current === 'todo') return 'in_progress'
    if (current === 'in_progress') return 'done'
    return 'todo'
  }

  return (
    <Drawer open onClose={onClose} title={project?.name ?? '…'} widthClass="w-[640px]">
      {error ? (
        <div className="text-p1 text-sm py-10 text-center">{t({ tr: 'Proje yüklenemedi.', en: 'Failed to load project.' })}</div>
      ) : isLoading || !project ? (
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
                disabled={!canManage}
                className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px] disabled:opacity-60"
              >
                {Object.entries(STATUS_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>
                    {pickLang(label, lang)}
                  </option>
                ))}
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
                    onClick={() => canManage && updateProject.mutate({ health: h })}
                    disabled={!canManage}
                    aria-pressed={project.health === h}
                    title={pickLang(HEALTH_LABEL[h], lang)}
                    aria-label={pickLang(HEALTH_LABEL[h], lang)}
                    className={`flex-1 h-[34px] rounded-lg border-2 disabled:opacity-60 ${project.health === h ? 'border-[var(--text)]' : 'border-transparent'} ${h === 'green' ? 'bg-ok' : h === 'amber' ? 'bg-p2' : 'bg-p1'}`}
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
            <button
              onClick={() => setTab('gantt')}
              className={`px-1 py-2 text-[12.5px] font-semibold mr-4 border-b-2 ${tab === 'gantt' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
            >
              Gantt
            </button>
          </div>

          {tab === 'tasks' && (
            <div>
              {tasksError && (
                <p className="text-p1 text-[12px] text-center py-4">{t({ tr: 'Görevler yüklenemedi.', en: 'Failed to load tasks.' })}</p>
              )}
              {canManage && (
                <>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTask()}
                      placeholder={t({ tr: 'Yeni görev ekle…', en: 'Add a new task…' })}
                      aria-label={t({ tr: 'Yeni görev ekle…', en: 'Add a new task…' })}
                      className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12.5px]"
                    />
                    <button
                      onClick={addTask}
                      title={t({ tr: 'Görev Ekle', en: 'Add Task' })}
                      aria-label={t({ tr: 'Görev Ekle', en: 'Add Task' })}
                      className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="date"
                      value={newTaskStart}
                      onChange={(e) => setNewTaskStart(e.target.value)}
                      title={t({ tr: 'Başlangıç (Gantt için)', en: 'Start date (for Gantt)' })}
                      className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px]"
                    />
                    <input
                      type="date"
                      value={newTaskDue}
                      onChange={(e) => setNewTaskDue(e.target.value)}
                      title={t({ tr: 'Bitiş (Gantt için)', en: 'Due date (for Gantt)' })}
                      className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px]"
                    />
                  </div>
                </>
              )}
              <div className="grid grid-cols-3 gap-2.5">
                {TASK_COLUMNS.map((col) => {
                  const colTasks = tasks?.filter((tk) => tk.status === col.key) ?? []
                  return (
                    <div key={col.key}>
                      <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase mb-2">{pickLang(col.label, lang)}</div>
                      <div className="space-y-1.5">
                        {colTasks.map((tk: ProjectTask) => (
                          <button
                            key={tk.id}
                            onClick={() => canManage && updateTaskStatus.mutate({ taskId: tk.id, status: nextStatus(tk.status) })}
                            disabled={!canManage}
                            title={t({ tr: `Sonraki duruma taşı: ${pickLang(TASK_COLUMNS.find((c) => c.key === nextStatus(tk.status))!.label, lang)}`, en: `Move to next status: ${pickLang(TASK_COLUMNS.find((c) => c.key === nextStatus(tk.status))!.label, lang)}` })}
                            className="w-full text-left bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-2.5 text-[11.5px] hover:border-brand disabled:hover:border-[var(--border)] disabled:cursor-default"
                          >
                            {tk.title}
                          </button>
                        ))}
                        {!colTasks.length && !tasksError && (
                          <p className="text-[10.5px] text-[var(--text-faint)] italic">—</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'risks' && (
            <div>
              {risksError && (
                <p className="text-p1 text-[12px] text-center py-4">{t({ tr: 'Riskler yüklenemedi.', en: 'Failed to load risks.' })}</p>
              )}
              {canManage && !showRiskForm && (
                <button
                  onClick={() => setShowRiskForm(true)}
                  className="w-full mb-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-[12px] font-semibold text-[var(--text-faint)]"
                >
                  + {t({ tr: 'Risk Ekle', en: 'Add Risk' })}
                </button>
              )}
              {canManage && showRiskForm && (
                <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3 mb-3 space-y-2">
                  <input
                    autoFocus
                    value={riskTitle}
                    onChange={(e) => setRiskTitle(e.target.value)}
                    placeholder={t({ tr: 'Risk başlığı…', en: 'Risk title…' })}
                    aria-label={t({ tr: 'Risk başlığı…', en: 'Risk title…' })}
                    className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
                  />
                  <textarea
                    value={riskDescription}
                    onChange={(e) => setRiskDescription(e.target.value)}
                    placeholder={t({ tr: 'Açıklama (opsiyonel)…', en: 'Description (optional)…' })}
                    aria-label={t({ tr: 'Açıklama', en: 'Description' })}
                    rows={2}
                    className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12px] resize-none"
                  />
                  <div className="flex gap-2">
                    <select value={riskImpact} onChange={(e) => setRiskImpact(e.target.value as RiskLevel)} className="flex-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[11.5px]">
                      {Object.entries(RISK_LEVEL_LABEL).map(([key, label]) => (
                        <option key={key} value={key}>
                          {t({ tr: `Etki: ${label.tr}`, en: `Impact: ${label.en}` })}
                        </option>
                      ))}
                    </select>
                    <select value={riskLikelihood} onChange={(e) => setRiskLikelihood(e.target.value as RiskLevel)} className="flex-1 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[11.5px]">
                      {Object.entries(RISK_LEVEL_LABEL).map(([key, label]) => (
                        <option key={key} value={key}>
                          {t({ tr: `Olasılık: ${label.tr}`, en: `Likelihood: ${label.en}` })}
                        </option>
                      ))}
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
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold flex-1">{r.title}</span>
                      <span className={`text-[10px] font-bold uppercase shrink-0 ${RISK_COLOR[r.impact]}`}>{pickLang(RISK_LEVEL_LABEL[r.impact], lang)}</span>
                    </div>
                    {r.description && <p className="text-[11px] text-[var(--text-faint)] mt-1">{r.description}</p>}
                    <div className="mt-1.5">
                      {canManage ? (
                        <select
                          value={r.status}
                          onChange={(e) => updateRiskStatus.mutate({ riskId: r.id, status: e.target.value as RiskStatus })}
                          aria-label={t({ tr: 'Risk durumu', en: 'Risk status' })}
                          className="text-[10.5px] font-semibold bg-[var(--panel)] border border-[var(--border)] rounded-md px-1.5 py-0.5"
                        >
                          {Object.entries(RISK_STATUS_LABEL).map(([key, label]) => (
                            <option key={key} value={key}>
                              {pickLang(label, lang)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10.5px] font-semibold text-[var(--text-faint)]">{pickLang(RISK_STATUS_LABEL[r.status], lang)}</span>
                      )}
                    </div>
                  </div>
                ))}
                {!risks?.length && !risksError && (
                  <p className="text-[11.5px] text-[var(--text-faint)] italic text-center py-4">
                    {t({ tr: 'Henüz risk kaydedilmedi', en: 'No risks logged yet' })}
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === 'gantt' && tasks && <GanttChart tasks={tasks} />}
        </div>
      )}
    </Drawer>
  )
}
