import { useState, useEffect } from 'react'
import { Sparkles, Save } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { useAiQuota, useAiUsageThisMonth, useSetAiQuota, getActionLabel, useRecentAiEvents, AI_EVENT_LABEL } from './useAdmin'

export function AiUsageTab() {
  const { lang, t } = useLang()
  const { data: quota, isLoading: quotaLoading, error: quotaError } = useAiQuota()
  const { data: usage, isLoading: usageLoading, error: usageError } = useAiUsageThisMonth()
  const setQuota = useSetAiQuota()
  const { data: recentEvents, isLoading: eventsLoading, error: eventsError } = useRecentAiEvents(25)

  const [limitInput, setLimitInput] = useState<number | null>(null)

  useEffect(() => {
    if (quota !== undefined && limitInput === null) setLimitInput(quota)
  }, [quota, limitInput])

  const totalUsed = usage?.reduce((sum, row) => sum + Number(row.call_count), 0) ?? 0
  const limit = quota ?? 500
  const pct = limit > 0 ? Math.min((totalUsed / limit) * 100, 100) : 0
  const barColor = pct >= 100 ? 'bg-p1' : pct >= 80 ? 'bg-p2' : 'bg-ok'

  const monthLabel = new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'long', year: 'numeric' })

  function handleSave() {
    if (limitInput === null || limitInput < 0) return
    setQuota.mutate(limitInput)
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Bu ayki kullanım */}
      <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-brand-dim" />
          <h3 className="font-display text-[15px] font-bold">{t({ tr: 'Bu Ayki AI Kullanımı', en: "This Month's AI Usage" })}</h3>
        </div>
        <p className="text-[11.5px] text-[var(--text-faint)] mb-4 capitalize">{monthLabel}</p>

        {(quotaLoading || usageLoading) && (
          <div className="text-[12px] text-[var(--text-faint)] py-4 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>
        )}
        {(quotaError || usageError) && !quotaLoading && !usageLoading && (
          <div className="text-[12px] text-p1 py-4 text-center">{t({ tr: 'Kullanım verileri yüklenemedi.', en: 'Failed to load usage data.' })}</div>
        )}

        {!quotaLoading && !usageLoading && !quotaError && !usageError && (
          <>
            <div className="flex items-end justify-between mb-1.5">
              <span className="font-display text-2xl font-bold">
                {totalUsed} <span className="text-[13px] font-normal text-[var(--text-faint)]">/ {limit}</span>
              </span>
              <span className={`text-[12px] font-bold ${pct >= 100 ? 'text-p1' : pct >= 80 ? 'text-p2' : 'text-ok'}`}>
                %{pct.toFixed(0)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--panel-2)] border border-[var(--border)] overflow-hidden mb-4">
              <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            {pct >= 100 && (
              <p className="text-[11.5px] text-p1 font-semibold mb-4">
                {t({
                  tr: 'Kota doldu — yeni AI çağrıları bu ay için reddedilecek. Aşağıdan kotayı artırabilirsiniz.',
                  en: 'Quota reached — new AI calls will be rejected this month. You can raise the quota below.',
                })}
              </p>
            )}

            <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2">
              {t({ tr: 'Aksiyon Bazında Dağılım', en: 'Breakdown by Action' })}
            </div>
            <div className="space-y-1.5 mb-5">
              {!usage?.length && (
                <div className="text-[12px] text-[var(--text-faint)] italic py-3">
                  {t({ tr: 'Bu ay henüz AI çağrısı yapılmadı.', en: 'No AI calls made this month yet.' })}
                </div>
              )}
              {usage?.map((row) => (
                <div key={row.action} className="flex items-center justify-between bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2">
                  <span className="text-[12.5px] font-semibold">{getActionLabel(row.action, lang)}</span>
                  <span className="text-[12.5px] font-mono text-[var(--text-faint)]">{row.call_count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Kota ayarı */}
      <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4 h-fit">
        <h3 className="font-display text-[15px] font-bold mb-1">{t({ tr: 'Aylık Kota', en: 'Monthly Quota' })}</h3>
        <p className="text-[11.5px] text-[var(--text-faint)] mb-3.5">
          {t({
            tr: 'Tüm servis masası kullanıcılarının (triyaj önerisi, özetleme, yanıt taslağı) birlikte kullanabileceği aylık toplam AI çağrı sayısı. Her ayın 1\'inde otomatik sıfırlanır.',
            en: 'Total monthly AI calls (triage suggestion, summarize, draft reply) shared across all service desk users. Resets automatically on the 1st of each month.',
          })}
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={limitInput ?? ''}
            onChange={(e) => setLimitInput(Number(e.target.value))}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
          />
          <Button onClick={handleSave} disabled={setQuota.isPending || limitInput === quota}>
            <Save className="w-[15px] h-[15px]" />
            {setQuota.isPending ? t({ tr: 'Kaydediliyor…', en: 'Saving…' }) : t({ tr: 'Kaydet', en: 'Save' })}
          </Button>
        </div>
        {setQuota.isSuccess && (
          <p className="text-[11px] text-ok font-semibold mt-2">{t({ tr: 'Kota güncellendi.', en: 'Quota updated.' })}</p>
        )}
      </div>
    
      {/* Faz 3 — AI Denetim İzi (ai_events) */}
      <div className="col-span-2 border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-brand-dim" />
          <h3 className="font-display text-[15px] font-bold">{t({ tr: 'AI Denetim İzi', en: 'AI Audit Trail' })}</h3>
        </div>
        <p className="text-[11.5px] text-[var(--text-faint)] mb-3">
          {t({ tr: 'Son 25 AI olayı — kim, hangi kayıtta, ne yaptı', en: 'Last 25 AI events — who did what, on which record' })}
        </p>
        {eventsLoading ? (
          <p className="text-[11.5px] text-[var(--text-faint)] italic">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
        ) : eventsError ? (
          <p className="text-[11.5px] text-p1">{t({ tr: 'AI olayları yüklenemedi.', en: 'Failed to load AI events.' })}</p>
        ) : !recentEvents?.length ? (
          <p className="text-[11.5px] text-[var(--text-faint)] italic">
            {t({ tr: 'Henüz AI olayı yok.', en: 'No AI events yet.' })}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {recentEvents.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 py-2 text-[11.5px]">
                <span className="font-mono text-[10px] text-[var(--text-faint)] shrink-0 w-[70px]">
                  {ev.incidents?.ref ?? '—'}
                </span>
                <span className="flex-1 text-[var(--text-sub)] truncate">
                  {t(AI_EVENT_LABEL[ev.event_type] ?? { tr: ev.event_type, en: ev.event_type })}
                </span>
                <span className="text-[var(--text-faint)] truncate max-w-[140px]">
                  {ev.user_profiles?.full_name ?? t({ tr: 'Sistem', en: 'System' })}
                </span>
                <span className="text-[var(--text-faint)] shrink-0">
                  {new Date(ev.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
