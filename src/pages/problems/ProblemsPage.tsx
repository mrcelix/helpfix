import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { PriorityBadge } from '@/components/ui/Badge'
import { useProblems, useClusterCandidates, type ProblemSavedView, type ClusterCandidate } from './useProblems'
import { ProblemDrawer } from './ProblemDrawer'
import { NewProblemModal } from './NewProblemModal'

const SAVED_VIEWS: { key: ProblemSavedView; label: { tr: string; en: string } }[] = [
  { key: 'all', label: { tr: 'Tümü', en: 'All' } },
  { key: 'open', label: { tr: 'Açık', en: 'Open' } },
  { key: 'mine', label: { tr: 'Benim Problemlerim', en: 'My Problems' } },
  { key: 'known_errors', label: { tr: 'Bilinen Hatalar', en: 'Known Errors' } },
]

const STATUS_LABEL: Record<string, { tr: string; en: string }> = {
  investigating: { tr: 'Araştırılıyor', en: 'Investigating' },
  root_cause_identified: { tr: 'Kök Neden Bulundu', en: 'Root Cause Found' },
  known_error: { tr: 'Bilinen Hata', en: 'Known Error' },
  monitoring: { tr: 'İzleniyor', en: 'Monitoring' },
  resolved: { tr: 'Çözüldü', en: 'Resolved' },
  closed: { tr: 'Kapatıldı', en: 'Closed' },
}

export function ProblemsPage() {
  const { lang, t } = useLang()
  const [view, setView] = useState<ProblemSavedView>('open')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [prefillCluster, setPrefillCluster] = useState<ClusterCandidate | null>(null)

  const { data: problems, isLoading, error } = useProblems(view)
  const { data: clusters } = useClusterCandidates()

  function openFromCluster(cluster: ClusterCandidate) {
    setPrefillCluster(cluster)
    setShowNewModal(true)
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {t({ tr: 'Problem Yönetimi', en: 'Problem Management' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Kök neden analizi ve bilinen hata veritabanı', en: 'Root cause analysis & known error database' })}
          </p>
        </div>
        <Button
          onClick={() => {
            setPrefillCluster(null)
            setShowNewModal(true)
          }}
        >
          <Plus className="w-[15px] h-[15px]" />
          {t({ tr: 'Yeni Problem', en: 'New Problem' })}
        </Button>
      </div>

      {/* AI Proaktif Tespit */}
      {!!clusters?.length && (
        <div className="mb-5 space-y-2.5">
          {clusters.map((c) => (
            <div
              key={c.category}
              className="flex items-center gap-3.5 rounded-2xl border border-purple/40 bg-purple-tint/40 px-4 py-3.5"
            >
              <div className="w-9 h-9 rounded-xl bg-purple flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold">
                  {t({
                    tr: `Son 7 günde "${c.category}" kategorisinde ${c.incident_count} olay tespit edildi`,
                    en: `${c.incident_count} incidents detected in "${c.category}" over the last 7 days`,
                  })}
                </div>
                <div className="text-[11.5px] text-[var(--text-faint)] truncate">
                  {c.sample_titles.slice(0, 3).join(' · ')}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => openFromCluster(c)}>
                {t({ tr: 'Problem Oluştur', en: 'Create Problem' })}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Saved views */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {SAVED_VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={
              'text-[12.5px] font-bold px-3.5 py-2 rounded-lg border transition-colors ' +
              (view === v.key
                ? 'bg-brand border-brand text-white'
                : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]')
            }
          >
            {v.label[lang]}
          </button>
        ))}
      </div>

      <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-hidden bg-[var(--panel)]">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
              <Th>{t({ tr: 'Ref', en: 'Ref' })}</Th>
              <Th>{t({ tr: 'Başlık', en: 'Title' })}</Th>
              <Th>{t({ tr: 'Öncelik', en: 'Priority' })}</Th>
              <Th>{t({ tr: 'Durum', en: 'Status' })}</Th>
              <Th>{t({ tr: 'Sahibi', en: 'Owner' })}</Th>
              <Th>{t({ tr: 'Oluşturma', en: 'Created' })}</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[var(--text-faint)]">
                  {t({ tr: 'Yükleniyor…', en: 'Loading…' })}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-p1">
                  {t({ tr: 'Bir hata oluştu.', en: 'Something went wrong.' })}
                </td>
              </tr>
            )}
            {!isLoading && !error && problems?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-14 text-[var(--text-faint)]">
                  {t({ tr: 'Bu görünümde kayıt yok.', en: 'Nothing in this view.' })}
                </td>
              </tr>
            )}
            {problems?.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--row-hover)] cursor-pointer"
              >
                <td className="px-3.5 py-3 font-mono text-[var(--text-faint)]">{p.ref}</td>
                <td className="px-3.5 py-3 font-semibold flex items-center gap-2">
                  {p.title}
                  {p.is_known_error && (
                    <span className="text-[9px] font-bold uppercase bg-purple-tint text-purple rounded-full px-1.5 py-0.5">
                      KE
                    </span>
                  )}
                </td>
                <td className="px-3.5 py-3">
                  <PriorityBadge priority={p.priority} />
                </td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{STATUS_LABEL[p.status]?.[lang] ?? p.status}</td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">
                  {p.owner?.full_name ?? <span className="italic text-[var(--text-faint)]">—</span>}
                </td>
                <td className="px-3.5 py-3 text-[var(--text-faint)]">
                  {new Date(p.created_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId && <ProblemDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
      {showNewModal && (
        <NewProblemModal prefillCluster={prefillCluster} onClose={() => setShowNewModal(false)} />
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">
      {children}
    </th>
  )
}
