// Faz 3 — AI Insights Widget'ı
//
// ai_events denetim izinden (0061) türeyen liderlik metrikleri:
//   * Triyaj isabet oranı — agent'lar AI önerisini ne sıklıkla aynen kabul etti
//   * Deflection — AI asistan kaç sorunu talep açılmadan çözdü
//   * Özet & taslak kullanımı — agent tarafında benimseme
// Altında "Haftalık Yönetici Özeti": ai-assist 'weekly-digest' action'ı ile
// son 7 günün Türkçe yönetici özetini üretir (panoya kopyalanabilir).

import { useState } from 'react'
import { Sparkles, ClipboardCopy, Check, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useAiAdoptionStats, useWeeklyDigest } from './useAnalytics'

export function AiInsightsWidget({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const { t } = useLang()
  const { data: stats, isLoading, error } = useAiAdoptionStats(30)
  const weeklyDigest = useWeeklyDigest()
  const [digest, setDigest] = useState<string | null>(null)
  const [digestError, setDigestError] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleDigest() {
    setDigest(null)
    setDigestError('')
    try {
      setDigest(await weeklyDigest.mutateAsync())
    } catch (err) {
      setDigestError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleCopy() {
    if (!digest) return
    try {
      await navigator.clipboard.writeText(digest)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // pano izni reddedilmiş olabilir — sessizce yoksay, kullanıcı metni elle seçip kopyalayabilir
    }
  }

  const cells: { label: { tr: string; en: string }; value: string; sub?: string }[] = [
    {
      label: { tr: 'Triyaj İsabet Oranı', en: 'Triage Accept Rate' },
      value: stats?.accept_rate != null ? `%${stats.accept_rate}` : '—',
      sub: stats
        ? `${stats.triage_accepted}/${stats.triage_accepted + stats.triage_rejected} ${t({ tr: 'kabul', en: 'accepted' })}`
        : undefined,
    },
    {
      label: { tr: 'AI Deflection', en: 'AI Deflection' },
      value: stats?.deflection_rate != null ? `%${stats.deflection_rate}` : '—',
      sub: stats
        ? `${stats.chat_deflected} ${t({ tr: 'talep açılmadan çözüldü', en: 'resolved without a ticket' })}`
        : undefined,
    },
    {
      label: { tr: 'Özet + Taslak', en: 'Summary + Draft' },
      value: String((stats?.summary_runs ?? 0) + (stats?.draft_runs ?? 0)),
      sub: t({ tr: 'agent kullanımı', en: 'agent usage' }),
    },
    {
      label: { tr: 'Toplam AI Olayı', en: 'Total AI Events' },
      value: String(stats?.total_events ?? 0),
      sub: t({ tr: 'son 30 gün', en: 'last 30 days' }),
    },
  ]

  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-dim" />
          <span className="text-[13px] font-bold">
            {t({ tr: 'AI Benimseme (30 gün)', en: 'AI Adoption (30d)' })}
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          title={collapsed ? t({ tr: 'Genişlet', en: 'Expand' }) : t({ tr: 'Daralt', en: 'Collapse' })}
          aria-label={collapsed ? t({ tr: 'Genişlet', en: 'Expand' }) : t({ tr: 'Daralt', en: 'Collapse' })}
          aria-expanded={!collapsed}
          className="text-[var(--text-faint)] hover:text-[var(--text)]"
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {error ? (
            <p className="text-p1 text-sm py-10 text-center">{t({ tr: 'AI kullanım verileri yüklenemedi.', en: 'Failed to load AI usage data.' })}</p>
          ) : isLoading ? (
            <p className="text-[var(--text-faint)] text-sm py-10 text-center">
              {t({ tr: 'Yükleniyor…', en: 'Loading…' })}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {cells.map((c, i) => (
                <div key={i} className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3.5">
                  <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                    {t(c.label)}
                  </div>
                  <div className="font-display text-[22px] font-bold text-brand-dim leading-none">{c.value}</div>
                  {c.sub && <div className="text-[10.5px] text-[var(--text-faint)] mt-1.5">{c.sub}</div>}
                </div>
              ))}
            </div>
          )}

          {(stats?.total_events ?? 0) === 0 && !isLoading && !error && (
            <p className="text-[11.5px] text-[var(--text-faint)] italic mb-4">
              {t({
                tr: 'Henüz veri yok — metrikler, agent\u2019lar AI önerilerini kullandıkça birikir.',
                en: 'No data yet — metrics accumulate as agents use AI suggestions.',
              })}
            </p>
          )}

          <div className="border-t border-[var(--border)] pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-[var(--text-sub)]">
                {t({ tr: 'Haftalık Yönetici Özeti', en: 'Weekly Executive Digest' })}
              </span>
              <div className="flex items-center gap-2">
                {digest && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-faint)] hover:text-[var(--text)]"
                  >
                    {copied ? <Check className="w-3 h-3 text-ok" /> : <ClipboardCopy className="w-3 h-3" />}
                    {copied ? t({ tr: 'Kopyalandı', en: 'Copied' }) : t({ tr: 'Kopyala', en: 'Copy' })}
                  </button>
                )}
                <button
                  onClick={handleDigest}
                  disabled={weeklyDigest.isPending}
                  className="flex items-center gap-1.5 text-[11.5px] font-bold text-brand-dim disabled:opacity-40"
                >
                  {weeklyDigest.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {digest
                    ? t({ tr: 'Yeniden Oluştur', en: 'Regenerate' })
                    : t({ tr: 'Özet Oluştur', en: 'Generate Digest' })}
                </button>
              </div>
            </div>
            {digest && (
              <div className="bg-brand-tint border border-brand/30 rounded-lg px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--text-sub)] whitespace-pre-wrap">
                {digest}
              </div>
            )}
            {digestError && (
              <p className="text-[11.5px] text-p1 mt-2">{t({ tr: 'Özet oluşturulamadı, tekrar deneyin.', en: 'Failed to generate digest, please try again.' })}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
