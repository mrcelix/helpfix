import { Wifi, WifiOff, Ticket } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import type { StoreAvailabilityRow } from './useStorePerformance'

const LINE_TYPE_LABEL: Record<string, string> = {
  dsl: 'DSL',
  mpls: 'MPLS',
  '3g': '3G',
  fiber: 'Fiber',
  other: 'Diğer',
}

export const CI_TYPE_LABEL: Record<string, { tr: string; en: string }> = {
  server: { tr: 'Sunucu', en: 'Server' },
  laptop: { tr: 'Laptop', en: 'Laptop' },
  desktop: { tr: 'Masaüstü', en: 'Desktop' },
  network_device: { tr: 'Ağ Cihazı', en: 'Network Device' },
  software_license: { tr: 'Yazılım Lisansı', en: 'Software License' },
  mobile_device: { tr: 'Mobil Cihaz', en: 'Mobile Device' },
  other: { tr: 'Diğer', en: 'Other' },
}

/** Faz MP-2 — Hatlar & Cihazlar ve Envanter SLA sekmelerinin PAYLAŞTIĞI
 * tablo ("aynı tablo" — CI listesi + anlık durum + periyoda göre
 * availability). Realtime nokta rengi useDeviceStatusRealtime tarafından
 * invalidate edilen query'den otomatik güncellenir — bu bileşen sadece
 * gelen veriyi çizer, kendi başına subscribe olmaz. */
export function CiAvailabilityTable({
  rows,
  isLoading,
  onSelectCi,
  onQuickCreateTicket,
}: {
  rows: StoreAvailabilityRow[] | undefined
  isLoading: boolean
  onSelectCi: (row: StoreAvailabilityRow) => void
  /** Faz MP-4 — verilirse hedef altı satırlarda "Talep Aç" hızlı aksiyonu
   * gösterilir (yönetici sekmeleri). MyStorePage bunu kasıtlı olarak
   * geçmez — Çalışan Merkezi salt-okunur kalır. */
  onQuickCreateTicket?: (row: StoreAvailabilityRow) => void
}) {
  const { t } = useLang()

  if (isLoading) {
    return <div className="text-[12px] text-[var(--text-faint)] py-10 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>
  }

  if (!rows?.length) {
    return (
      <div className="text-[12px] text-[var(--text-faint)] py-10 text-center px-6">
        {t({ tr: 'Bu kategoride cihaz bulunamadı.', en: 'No devices found in this category.' })}
      </div>
    )
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {rows.map((r) => {
        const deviation = r.availability_percent != null && r.availability_target != null ? r.availability_percent - r.availability_target : null
        const belowTarget = deviation != null && deviation < 0
        return (
          <div
            key={r.ci_id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectCi(r)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectCi(r)
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--row-hover)] cursor-pointer"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${r.is_currently_online ? 'bg-ok' : 'bg-p1'}`}
              title={r.is_currently_online ? t({ tr: 'Çevrimiçi', en: 'Online' }) : t({ tr: 'Çevrimdışı', en: 'Offline' })}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate">{r.name}</div>
              <div className="text-[11px] text-[var(--text-faint)] mt-0.5 flex items-center gap-2">
                <span>{t(CI_TYPE_LABEL[r.ci_type] ?? { tr: r.ci_type, en: r.ci_type })}</span>
                {r.line_type && (
                  <span className="text-[9px] font-bold bg-brand-tint text-brand-dim rounded-full px-1.5 py-0.5">
                    {LINE_TYPE_LABEL[r.line_type] ?? r.line_type}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {r.is_currently_online ? <Wifi className="w-3.5 h-3.5 text-ok" /> : <WifiOff className="w-3.5 h-3.5 text-p1" />}
            </div>
            <div className="text-right shrink-0 w-[110px]">
              <div className={`text-[13px] font-bold ${belowTarget ? 'text-p1' : 'text-[var(--text)]'}`}>
                {r.availability_percent != null ? `%${r.availability_percent}` : t({ tr: 'veri yok', en: 'no data' })}
              </div>
              <div className="text-[10px] text-[var(--text-faint)] mt-0.5">
                {r.availability_target != null ? (
                  <>
                    {t({ tr: 'Hedef', en: 'Target' })} %{r.availability_target}
                    {deviation != null && (
                      <span className={belowTarget ? 'text-p1 font-bold' : 'text-ok font-bold'}>
                        {' '}
                        ({deviation > 0 ? '+' : ''}
                        {deviation.toFixed(1)})
                      </span>
                    )}
                  </>
                ) : (
                  '—'
                )}
              </div>
            </div>
            {belowTarget && onQuickCreateTicket && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onQuickCreateTicket(r)
                }}
                title={t({ tr: 'Talep Aç', en: 'Open Ticket' })}
                className="shrink-0 flex items-center gap-1 text-[10.5px] font-bold text-p1 bg-p1-tint rounded-full px-2 py-1 hover:opacity-80"
              >
                <Ticket className="w-3 h-3" />
                {t({ tr: 'Talep Aç', en: 'Open Ticket' })}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
