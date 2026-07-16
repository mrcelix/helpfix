import { Wifi, WifiOff } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { useLang } from '@/contexts/LangContext'
import { useCiEventTimeline, type StoreAvailabilityRow } from './useStorePerformance'

const LINE_TYPE_LABEL: Record<string, string> = {
  dsl: 'DSL',
  mpls: 'MPLS',
  '3g': '3G',
  fiber: 'Fiber',
  other: 'Diğer',
}

/** Mağaza Performansı > Hatlar & Cihazlar / Envanter SLA tablosunda bir
 * satıra tıklanınca açılan hafif drawer — StoreDetailDrawer'dan (mağaza
 * bazlı, ağır) FARKLI: tek bir CI'ın son 50 olayı + periyot içi downtime
 * dökümü. Satırın kendi verisi (availability_percent vb.) zaten parent'ta
 * hesaplanmış olduğu için burada tekrar RPC çağrılmaz — sadece ham olay
 * listesi (device_status_events) çekilir. */
export function CiAvailabilityDrawer({ ci, onClose }: { ci: StoreAvailabilityRow; onClose: () => void }) {
  const { lang, t } = useLang()
  const { data: events, isLoading } = useCiEventTimeline(ci.ci_id)

  return (
    <Drawer open onClose={onClose} title={ci.name} subtitle={t({ tr: 'Cihaz Çalışırlık Detayı', en: 'Device Availability Detail' })} widthClass="w-[420px]">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3.5 text-center">
            <div className="font-display text-2xl font-bold">
              {ci.availability_percent != null ? `%${ci.availability_percent}` : '—'}
            </div>
            <div className="text-[10.5px] text-[var(--text-faint)] mt-1">{t({ tr: 'Çalışırlık', en: 'Availability' })}</div>
          </div>
          <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3.5 text-center">
            <div className="font-display text-2xl font-bold">
              {ci.availability_target != null ? `%${ci.availability_target}` : '—'}
            </div>
            <div className="text-[10.5px] text-[var(--text-faint)] mt-1">{t({ tr: 'Hedef', en: 'Target' })}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5">
          {ci.is_currently_online ? <Wifi className="w-4 h-4 text-ok shrink-0" /> : <WifiOff className="w-4 h-4 text-p1 shrink-0" />}
          <span className="text-[12.5px] font-semibold flex-1">
            {ci.is_currently_online ? t({ tr: 'Şu an çevrimiçi', en: 'Currently online' }) : t({ tr: 'Şu an çevrimdışı', en: 'Currently offline' })}
          </span>
          {ci.line_type && (
            <span className="text-[9.5px] font-bold bg-brand-tint text-brand-dim rounded-full px-2 py-0.5">
              {LINE_TYPE_LABEL[ci.line_type] ?? ci.line_type}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3.5 text-center">
            <div className="font-display text-[17px] font-bold">
              {ci.downtime_minutes != null ? `${ci.downtime_minutes} ${t({ tr: 'dk', en: 'min' })}` : '—'}
            </div>
            <div className="text-[10.5px] text-[var(--text-faint)] mt-1">{t({ tr: 'Periyot İçi Kesinti', en: 'Downtime This Period' })}</div>
          </div>
          <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3.5 text-center">
            <div className="font-display text-[17px] font-bold">{ci.event_count}</div>
            <div className="text-[10.5px] text-[var(--text-faint)] mt-1">{t({ tr: 'Durum Değişikliği', en: 'Status Changes' })}</div>
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2">
            {t({ tr: 'Son Olaylar (50)', en: 'Recent Events (50)' })}
          </div>
          {isLoading && <p className="text-[11.5px] text-[var(--text-faint)] italic">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}
          {!isLoading && !events?.length && (
            <p className="text-[11px] text-[var(--text-faint)] italic">
              {t({ tr: 'Henüz kayıtlı bir durum olayı yok.', en: 'No status events recorded yet.' })}
            </p>
          )}
          <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
            {events?.map((e) => (
              <div key={e.id} className="flex items-center gap-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2">
                {e.is_online ? <Wifi className="w-3.5 h-3.5 text-ok shrink-0" /> : <WifiOff className="w-3.5 h-3.5 text-p1 shrink-0" />}
                <span className="text-[12px] font-medium flex-1">
                  {e.is_online ? t({ tr: 'Çevrimiçi oldu', en: 'Came online' }) : t({ tr: 'Çevrimdışı oldu', en: 'Went offline' })}
                </span>
                <span className="text-[10.5px] text-[var(--text-faint)] shrink-0">
                  {new Date(e.occurred_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  )
}
