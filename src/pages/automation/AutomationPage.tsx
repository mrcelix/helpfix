import { useState } from 'react'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { useAutomationRules, useToggleRule, useDeleteRule } from './useAutomation'

const TRIGGER_LABEL: Record<string, { tr: string; en: string }> = {
  incident_created: { tr: 'Yeni Olay', en: 'New Incident' },
  problem_created: { tr: 'Yeni Problem', en: 'New Problem' },
  change_created: { tr: 'Yeni Değişiklik', en: 'New Change' },
}
import { NewRuleModal } from './NewRuleModal'

export function AutomationPage() {
  const { lang, t } = useLang()
  const [showNewModal, setShowNewModal] = useState(false)
  const { data: rules, isLoading } = useAutomationRules()
  const toggleRule = useToggleRule()
  const deleteRule = useDeleteRule()

  const totalExecutions = rules?.reduce((s, r) => s + r.execution_count, 0) ?? 0

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple flex items-center justify-center">
            <Sparkles className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-[22px] font-bold tracking-tight">
                {t({ tr: 'AI Otomasyon', en: 'AI Automation' })}
              </h1>
              <span className="text-[9px] font-mono font-bold bg-purple-tint text-purple rounded-full px-1.5 py-0.5">BETA</span>
            </div>
            <p className="text-[13px] text-[var(--text-faint)] mt-0.5">
              {t({ tr: 'Kural tabanlı otomasyon — koşul karşılanınca otomatik işlem', en: 'Rule-based automation — auto-action when a condition matches' })}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="w-[15px] h-[15px]" />
          {t({ tr: 'Yeni Kural', en: 'New Rule' })}
        </Button>
      </div>

      <div className="bg-purple-tint/40 border border-purple/40 rounded-2xl p-4 mb-6 flex items-center gap-4">
        <div className="font-display text-2xl font-bold text-purple">{totalExecutions}</div>
        <div className="text-[12.5px] text-[var(--text-sub)]">
          {t({ tr: 'kez otomatik olarak uygulandı (toplam kural çalıştırma sayısı)', en: 'automatic applications (total rule executions)' })}
        </div>
      </div>

      {isLoading && <p className="text-[var(--text-faint)] text-sm py-8 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}
      {!isLoading && rules?.length === 0 && (
        <p className="text-[var(--text-faint)] text-sm py-14 text-center">
          {t({ tr: 'Henüz otomasyon kuralı yok.', en: 'No automation rules yet.' })}
        </p>
      )}

      <div className="space-y-2.5">
        {rules?.map((r) => (
          <div key={r.id} className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="font-bold text-[13.5px] mb-1">{r.name}</div>
              <div className="text-[11.5px] text-[var(--text-faint)]">
                <span className="font-bold text-[var(--text-sub)]">{TRIGGER_LABEL[r.trigger_type]?.[lang]}</span>
                {' · '}
                {t({ tr: 'Eğer', en: 'If' })}{' '}
                {r.condition_category ? `kategori = "${r.condition_category}"` : t({ tr: 'herhangi bir kategori', en: 'any category' })}
                {r.condition_priority && ` + öncelik = ${r.condition_priority}`}
                {' → '}
                {r.action_type === 'assign_to_user'
                  ? `${t({ tr: 'ata', en: 'assign to' })}: ${r.assignee?.full_name ?? '—'}`
                  : `${t({ tr: 'önceliği ayarla', en: 'set priority' })}: ${r.action_priority}`}
              </div>
              <div className="text-[10.5px] text-purple font-semibold mt-1">
                {r.execution_count} {t({ tr: 'kez çalıştı', en: 'executions' })}
              </div>
            </div>
            <button
              onClick={() => toggleRule.mutate({ id: r.id, is_active: !r.is_active })}
              className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${r.is_active ? 'bg-ok' : 'bg-[var(--border)]'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${r.is_active ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
            <button onClick={() => deleteRule.mutate(r.id)} className="text-[var(--text-faint)] hover:text-p1 shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {showNewModal && <NewRuleModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}
