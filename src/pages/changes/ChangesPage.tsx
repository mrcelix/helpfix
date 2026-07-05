import { useState } from 'react'
import { Plus, Snowflake } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { useChanges, type ChangeSavedView } from './useChanges'
import { ChangeDrawer } from './ChangeDrawer'
import { NewChangeModal } from './NewChangeModal'
import { FreezeWindowsModal } from './FreezeWindowsModal'
import { ChangeTemplatesModal } from './ChangeTemplatesModal'

const SAVED_VIEWS: { key: ChangeSavedView; label: { tr: string; en: string } }[] = [
  { key: 'all', label: { tr: 'Tümü', en: 'All' } },
  { key: 'scheduled', label: { tr: 'Planlanan', en: 'Scheduled' } },
  { key: 'high_risk', label: { tr: 'Yüksek Risk', en: 'High Risk' } },
]

const STATUS_LABEL: Record<string, { tr: string; en: string }> = {
  draft: { tr: 'Taslak', en: 'Draft' },
  submitted: { tr: 'Gönderildi', en: 'Submitted' },
  technical_review: { tr: 'Teknik İnceleme', en: 'Technical Review' },
  cab_review: { tr: 'CAB İncelemesi', en: 'CAB Review' },
  approved: { tr: 'Onaylandı', en: 'Approved' },
  scheduled: { tr: 'Planlandı', en: 'Scheduled' },
  in_progress: { tr: 'Uygulanıyor', en: 'In Progress' },
  completed: { tr: 'Tamamlandı', en: 'Completed' },
  failed: { tr: 'Başarısız', en: 'Failed' },
  closed: { tr: 'Kapatıldı', en: 'Closed' },
}

const TYPE_LABEL: Record<string, { tr: string; en: string }> = {
  standard: { tr: 'Standart', en: 'Standard' },
  normal: { tr: 'Normal', en: 'Normal' },
  emergency: { tr: 'Acil', en: 'Emergency' },
}

function riskColor(score: number) {
  if (score >= 60) return 'text-p1 bg-p1-tint'
  if (score >= 31) return 'text-p2 bg-p2-tint'
  return 'text-ok bg-[#0F2E1F]'
}

export function ChangesPage() {
  const { lang, t } = useLang()
  const [view, setView] = useState<ChangeSavedView>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showFreezeModal, setShowFreezeModal] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)

  const { data: changes, isLoading, error } = useChanges(view)

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {t({ tr: 'Değişiklik Yönetimi', en: 'Change Management' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Risk skoru, çift katmanlı onay ve PIR takibi', en: 'Risk scoring, dual-tier approval, and PIR tracking' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowFreezeModal(true)}>
            <Snowflake className="w-[15px] h-[15px]" />
            {t({ tr: 'Dondurma Pencereleri', en: 'Freeze Windows' })}
          </Button>
          <Button variant="ghost" onClick={() => setShowTemplatesModal(true)}>
            🚀 {t({ tr: 'Şablonlar', en: 'Templates' })}
          </Button>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="w-[15px] h-[15px]" />
            {t({ tr: 'Yeni Değişiklik', en: 'New Change' })}
          </Button>
        </div>
      </div>

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
              <Th>{t({ tr: 'Tip', en: 'Type' })}</Th>
              <Th>{t({ tr: 'AI Risk Skoru', en: 'AI Risk Score' })}</Th>
              <Th>{t({ tr: 'Durum', en: 'Status' })}</Th>
              <Th>{t({ tr: 'Planlanan', en: 'Scheduled' })}</Th>
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
            {!isLoading && !error && changes?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-14 text-[var(--text-faint)]">
                  {t({ tr: 'Bu görünümde kayıt yok.', en: 'Nothing in this view.' })}
                </td>
              </tr>
            )}
            {changes?.map((c) => (
              <tr
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--row-hover)] cursor-pointer"
              >
                <td className="px-3.5 py-3 font-mono text-[var(--text-faint)]">{c.ref}</td>
                <td className="px-3.5 py-3 font-semibold">{c.title}</td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{TYPE_LABEL[c.change_type]?.[lang]}</td>
                <td className="px-3.5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${riskColor(c.risk_score)}`}>
                    {c.risk_score}
                  </span>
                </td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{STATUS_LABEL[c.status]?.[lang] ?? c.status}</td>
                <td className="px-3.5 py-3 text-[var(--text-faint)]">
                  {c.scheduled_start ? new Date(c.scheduled_start).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId && <ChangeDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
      {showNewModal && <NewChangeModal onClose={() => setShowNewModal(false)} />}
      {showFreezeModal && <FreezeWindowsModal onClose={() => setShowFreezeModal(false)} />}
      {showTemplatesModal && <ChangeTemplatesModal onClose={() => setShowTemplatesModal(false)} />}
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
