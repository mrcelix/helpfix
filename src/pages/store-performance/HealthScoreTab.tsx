import { useState } from 'react'
import { ChevronLeft, ChevronRight, Sparkles, Tag, ShoppingCart, Wifi, Headphones } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { useStoreHealthScores, useGenerateWeeklyScores, currentWeekStart, type StoreHealthScore } from './useStorePerformance'
import { Pillar } from './Pillar'
import { HealthPillarModal, type HealthPillarKey } from './HealthPillarModal'

const GRADE_STYLE: Record<string, string> = {
  A: 'bg-ok/15 text-ok border-ok/40',
  B: 'bg-p2-tint text-p2 border-p2/40',
  C: 'bg-p1-tint text-p1 border-p1/40',
}

function shiftWeek(weekStart: string, deltaWeeks: number): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + deltaWeeks * 7)
  return d.toISOString().slice(0, 10)
}

export function HealthScoreTab() {
  const { lang, t } = useLang()
  const [weekStart, setWeekStart] = useState(currentWeekStart())
  const { data: scores, isLoading } = useStoreHealthScores(weekStart)
  const generate = useGenerateWeeklyScores()
  const [drilldown, setDrilldown] = useState<{ siteId: string; storeName: string; pillar: HealthPillarKey } | null>(null)

  const weekLabel = (() => {
    const start = new Date(weekStart + 'T00:00:00')
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const fmt = (d: Date) => d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' })
    return `${fmt(start)} \u2013 ${fmt(end)}`
  })()

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-display text-[15px] font-bold">{t({ tr: 'Mağaza IT Sağlığı Skoru (Proaktif Ölçüm)', en: 'Store IT Health Score (Proactive Measurement)' })}</h3>
          <p className="text-[11.5px] text-[var(--text-faint)] mt-0.5">
            {t({
              tr: 'ESL, Kiosk & Mobil Kasa, Network ve Yardım Masası sinyallerinden haftalık üretilen tek çıktı: A/B/C. Mağazacılık, Operasyon ve İç Denetim ile ortak görünürlük.',
              en: 'A single weekly output — A/B/C — from ESL, Kiosk & Mobile POS, Network, and Help Desk signals. Shared visibility with Retail, Operations, and Internal Audit.',
            })}
          </p>
        </div>
        <Button onClick={() => generate.mutate(weekStart)} disabled={generate.isPending}>
          <Sparkles className="w-[15px] h-[15px]" />
          {generate.isPending ? t({ tr: 'Üretiliyor…', en: 'Generating…' }) : t({ tr: 'Haftalık Skor Üret', en: 'Generate Weekly Score' })}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={() => setWeekStart((w) => shiftWeek(w, -1))}
          title={t({ tr: 'Önceki hafta', en: 'Previous week' })}
          aria-label={t({ tr: 'Önceki hafta', en: 'Previous week' })}
          className="w-7 h-7 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text)]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[12.5px] font-bold">{weekLabel}</span>
        <button
          onClick={() => setWeekStart((w) => shiftWeek(w, 1))}
          title={t({ tr: 'Sonraki hafta', en: 'Next week' })}
          aria-label={t({ tr: 'Sonraki hafta', en: 'Next week' })}
          className="w-7 h-7 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text)]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {weekStart !== currentWeekStart() && (
          <button onClick={() => setWeekStart(currentWeekStart())} className="text-[11px] font-bold text-brand-dim">
            {t({ tr: 'Bu hafta', en: 'This week' })}
          </button>
        )}
      </div>

      {isLoading && <div className="text-[12px] text-[var(--text-faint)] py-10 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>}
      {!isLoading && !scores?.length && (
        <div className="text-[12px] text-[var(--text-faint)] py-12 text-center px-6 border border-dashed border-[var(--border)] rounded-xl">
          {t({
            tr: 'Bu hafta için henüz skor üretilmedi. "Haftalık Skor Üret" butonuna basarak ilk hesaplamayı yapın.',
            en: 'No score generated for this week yet. Click "Generate Weekly Score" to run the first calculation.',
          })}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {scores?.map((s) => (
          <StoreHealthCard key={s.site_id} score={s} t={t} onOpenPillar={(pillar) => setDrilldown({ siteId: s.site_id, storeName: s.site_name, pillar })} />
        ))}
      </div>

      {drilldown && (
        <HealthPillarModal
          siteId={drilldown.siteId}
          storeName={drilldown.storeName}
          pillar={drilldown.pillar}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  )
}

function StoreHealthCard({
  score: s,
  t,
  onOpenPillar,
}: {
  score: StoreHealthScore
  t: (d: { tr: string; en: string }) => string
  onOpenPillar: (pillar: HealthPillarKey) => void
}) {
  return (
    <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display text-[14px] font-bold">{s.site_name}</h4>
        <span className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-display text-[16px] font-bold ${GRADE_STYLE[s.letter_grade]}`}>
          {s.letter_grade}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Pillar
          icon={Tag}
          label={t({ tr: 'ESL Durumu', en: 'ESL Status' })}
          score={s.esl_score}
          detail={`${t({ tr: 'Offline', en: 'Offline' })} %${s.esl_offline_pct}`}
          onClick={() => onOpenPillar('esl')}
        />
        <Pillar
          icon={ShoppingCart}
          label={t({ tr: 'Kiosk & Mobil Kasa', en: 'Kiosk & Mobile POS' })}
          score={s.kiosk_score}
          detail={`${t({ tr: 'Çalışırlık', en: 'Uptime' })} %${s.kiosk_uptime_pct}`}
          onClick={() => onOpenPillar('kiosk_pos')}
        />
        <Pillar
          icon={Wifi}
          label={t({ tr: 'Network', en: 'Network' })}
          score={s.network_score}
          detail={`${s.network_downtime_minutes} ${t({ tr: 'dk kesinti', en: 'min downtime' })}`}
          onClick={() => onOpenPillar('network')}
        />
        <Pillar
          icon={Headphones}
          label={t({ tr: 'Yardım Masası', en: 'Help Desk' })}
          score={s.helpdesk_score}
          detail={`${s.helpdesk_call_count} ${t({ tr: 'çağrı', en: 'calls' })}, ${s.helpdesk_sla_breach_count} ${t({ tr: 'ihlal', en: 'breach' })}`}
          onClick={() => onOpenPillar('helpdesk')}
        />
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
        <span className="text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide">{t({ tr: 'Bileşik Skor', en: 'Composite Score' })}</span>
        <span className="font-display text-[18px] font-bold">{s.composite_score}</span>
      </div>
    </div>
  )
}
