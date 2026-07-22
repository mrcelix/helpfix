import { useState } from 'react'
import { Tag, ShoppingCart, Wifi, Headphones } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useMySite, useMyStoreHealthScore } from '../useMyStore'
import { useStorePeriod, useStoreScoreTrend } from '@/pages/store-performance/useStorePerformance'
import { Pillar } from '@/pages/store-performance/Pillar'
import { HealthPillarModal, type HealthPillarKey } from '@/pages/store-performance/HealthPillarModal'

const GRADE_STYLE: Record<string, string> = {
  A: 'bg-ok/15 text-ok border-ok/40',
  B: 'bg-p2-tint text-p2 border-p2/40',
  C: 'bg-p1-tint text-p1 border-p1/40',
}

export function MyStoreHealthWidget() {
  const { t } = useLang()
  const { data: site } = useMySite()
  const { data: health } = useMyStoreHealthScore()
  const [period] = useStorePeriod('week')
  const { data: scoreTrend } = useStoreScoreTrend(site?.id ?? null, period)
  const [pillarDrilldown, setPillarDrilldown] = useState<HealthPillarKey | null>(null)

  return (
    <div className="h-full border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-5 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-[15px] font-bold">{t({ tr: 'BT Sağlık Skoru', en: 'IT Health Score', fr: 'Score de santé IT', it: 'Punteggio salute IT', ar: 'درجة سلامة تقنية المعلومات' })}</h3>
        {health && (
          <span className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-display text-[17px] font-bold ${GRADE_STYLE[health.letter_grade]}`}>
            {health.letter_grade}
          </span>
        )}
      </div>
      {!health ? (
        <p className="text-[12.5px] text-[var(--text-faint)] italic">{t({ tr: 'Bu hafta için henüz skor hesaplanmadı.', en: 'No score computed for this week yet.', fr: 'Aucun score calculé pour cette semaine.', it: 'Nessun punteggio calcolato per questa settimana.', ar: 'لم يتم احتساب أي درجة لهذا الأسبوع بعد.' })}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
            <Pillar
              icon={Tag}
              label={t({ tr: 'ESL Durumu', en: 'ESL Status', fr: 'État ESL', it: 'Stato ESL', ar: 'حالة الملصقات الإلكترونية' })}
              score={health.esl_score}
              detail={`${t({ tr: 'Offline', en: 'Offline', fr: 'Hors ligne', it: 'Offline', ar: 'غير متصل' })} %${health.esl_offline_pct}`}
              onClick={() => setPillarDrilldown('esl')}
            />
            <Pillar
              icon={ShoppingCart}
              label={t({ tr: 'Kiosk & Kasa', en: 'Kiosk & POS', fr: 'Kiosque et caisse', it: 'Kiosk e cassa', ar: 'الكشك ونقاط البيع' })}
              score={health.kiosk_score}
              detail={`${t({ tr: 'Çalışırlık', en: 'Uptime', fr: 'Disponibilité', it: 'Uptime', ar: 'وقت التشغيل' })} %${health.kiosk_uptime_pct}`}
              onClick={() => setPillarDrilldown('kiosk_pos')}
            />
            <Pillar
              icon={Wifi}
              label={t({ tr: 'Network', en: 'Network', fr: 'Réseau', it: 'Rete', ar: 'الشبكة' })}
              score={health.network_score}
              detail={`${health.network_downtime_minutes} ${t({ tr: 'dk kesinti', en: 'min down', fr: "min d'arrêt", it: 'min di inattività', ar: 'دقيقة توقف' })}`}
              onClick={() => setPillarDrilldown('network')}
            />
            <Pillar
              icon={Headphones}
              label={t({ tr: 'Yardım Masası', en: 'Help Desk', fr: "Service d'assistance", it: 'Help desk', ar: 'مكتب المساعدة' })}
              score={health.helpdesk_score}
              detail={`${health.helpdesk_call_count} ${t({ tr: 'çağrı', en: 'calls', fr: 'appels', it: 'chiamate', ar: 'مكالمات' })}`}
              onClick={() => setPillarDrilldown('helpdesk')}
            />
          </div>
          {!!scoreTrend?.length && (
            <div className="flex items-end gap-1.5 h-16 pt-2 border-t border-[var(--border)]">
              {scoreTrend.map((p) => (
                <div key={p.period_label} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${p.period_label}: ${p.score}`}>
                  <div
                    className={`w-full rounded-t-sm ${p.score >= 85 ? 'bg-ok' : p.score >= 70 ? 'bg-p2' : 'bg-p1'}`}
                    style={{ height: `${Math.max(p.score, 6)}%` }}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {pillarDrilldown && site && (
        <HealthPillarModal siteId={site.id} storeName={site.name} pillar={pillarDrilldown} onClose={() => setPillarDrilldown(null)} />
      )}
    </div>
  )
}
