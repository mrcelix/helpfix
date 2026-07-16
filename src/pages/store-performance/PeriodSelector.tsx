import { useLang } from '@/contexts/LangContext'
import type { StorePeriod } from './useStorePerformance'

const PERIOD_LABEL: Record<StorePeriod, { tr: string; en: string }> = {
  day: { tr: 'Günlük', en: 'Daily' },
  week: { tr: 'Haftalık', en: 'Weekly' },
  month: { tr: 'Aylık', en: 'Monthly' },
  year: { tr: 'Yıllık', en: 'Yearly' },
}
const DEFAULT_PERIODS: StorePeriod[] = ['day', 'week', 'month', 'year']

/** Mağaza Performansı (yönetici) ve Mağazam (çalışan) sekmelerinin
 * paylaştığı G/H/A/Y segmented seçici. `periods` ile alt küme verilebilir
 * (ör. Mağazam sadece Günlük/Haftalık/Aylık gösterir, Yıllık'ı kaldırır). */
export function PeriodSelector({
  period,
  onChange,
  periods = DEFAULT_PERIODS,
}: {
  period: StorePeriod
  onChange: (p: StorePeriod) => void
  periods?: StorePeriod[]
}) {
  const { t } = useLang()
  return (
    <div className="flex items-center bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-0.5 shrink-0">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-2.5 py-1.5 text-[11.5px] font-bold rounded-md transition-colors ${
            period === p ? 'bg-brand text-white' : 'text-[var(--text-faint)] hover:text-[var(--text)]'
          }`}
        >
          {t(PERIOD_LABEL[p])}
        </button>
      ))}
    </div>
  )
}
