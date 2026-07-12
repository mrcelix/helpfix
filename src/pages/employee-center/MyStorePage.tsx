import { Store, AlertTriangle, Ticket, Package, Monitor, Tag, ShoppingCart, Wifi, Headphones } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import {
  useMySite,
  useMyStoreHealthScore,
  useMyStoreHealthHistory,
  useMyStoreIncidents,
  useMyStoreAssets,
  useMyStoreConsumables,
} from './useMyStore'

const GRADE_STYLE: Record<string, string> = {
  A: 'bg-ok/15 text-ok border-ok/40',
  B: 'bg-p2-tint text-p2 border-p2/40',
  C: 'bg-p1-tint text-p1 border-p1/40',
}

const PRIORITY_STYLE: Record<string, string> = {
  P1: 'bg-p1-tint text-p1',
  P2: 'bg-p2-tint text-p2',
  P3: 'bg-brand-tint text-brand-dim',
  P4: 'bg-[var(--panel-2)] text-[var(--text-faint)]',
}

export function MyStorePage() {
  const { t } = useLang()
  const { data: site, isLoading: siteLoading } = useMySite()
  const { data: health } = useMyStoreHealthScore()
  const { data: history } = useMyStoreHealthHistory()
  const { data: incidents } = useMyStoreIncidents()
  const { data: assets } = useMyStoreAssets()
  const { data: consumables } = useMyStoreConsumables()

  if (siteLoading) {
    return <div className="py-16 text-center text-[13px] text-[var(--text-faint)]">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>
  }

  if (!site) {
    return (
      <div className="py-16 text-center px-6">
        <Store className="w-10 h-10 text-[var(--text-faint)] mx-auto mb-3" />
        <p className="text-[13px] text-[var(--text-faint)] max-w-sm mx-auto">
          {t({
            tr: 'Henüz bir mağazaya atanmadınız. Yöneticinizden Admin Panel > Kullanıcılar üzerinden mağaza ataması yapmasını isteyin.',
            en: "You haven't been assigned to a store yet. Ask your manager to assign one from Admin Panel > Users.",
          })}
        </p>
      </div>
    )
  }

  const openIncidents = incidents?.filter((i) => !['resolved', 'closed', 'merged'].includes(i.status)).length ?? 0
  const criticalOpen = incidents?.filter((i) => i.priority === 'P1' && !['resolved', 'closed', 'merged'].includes(i.status)).length ?? 0
  const onlineAssets = assets?.filter((a) => a.is_online).length ?? 0
  const lowStockConsumables = consumables?.filter((c) => c.total_quantity <= c.low_stock_threshold) ?? []

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-brand-tint flex items-center justify-center shrink-0">
          <Store className="w-5 h-5 text-brand-dim" />
        </div>
        <div>
          <h1 className="font-display text-[20px] font-bold tracking-tight">{site.name}</h1>
          <p className="text-[12.5px] text-[var(--text-faint)]">{site.city}</p>
        </div>
      </div>

      {(criticalOpen > 0 || lowStockConsumables.length > 0) && (
        <div className="flex flex-col gap-2 mb-5">
          {criticalOpen > 0 && (
            <div className="flex items-center gap-2.5 bg-p1-tint border border-p1/40 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-p1 shrink-0" />
              <span className="text-[12.5px] font-bold text-p1">
                {t({ tr: `Mağazanızda ${criticalOpen} kritik açık talep var`, en: `${criticalOpen} critical open ticket(s) at your store` })}
              </span>
            </div>
          )}
          {lowStockConsumables.length > 0 && (
            <div className="flex items-center gap-2.5 bg-p2-tint border border-p2/40 rounded-xl px-4 py-3">
              <Package className="w-4 h-4 text-p2 shrink-0" />
              <span className="text-[12.5px] font-bold text-p2">
                {t({ tr: 'Düşük stok:', en: 'Low stock:' })} {lowStockConsumables.map((c) => c.name).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-[15px] font-bold">{t({ tr: 'BT Sağlık Skoru', en: 'IT Health Score' })}</h3>
          {health && (
            <span className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-display text-[17px] font-bold ${GRADE_STYLE[health.letter_grade]}`}>
              {health.letter_grade}
            </span>
          )}
        </div>
        {!health ? (
          <p className="text-[12.5px] text-[var(--text-faint)] italic">{t({ tr: 'Bu hafta için henüz skor hesaplanmadı.', en: 'No score computed for this week yet.' })}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
              <Pillar icon={Tag} label={t({ tr: 'ESL Durumu', en: 'ESL Status' })} score={health.esl_score} detail={`${t({ tr: 'Offline', en: 'Offline' })} %${health.esl_offline_pct}`} />
              <Pillar icon={ShoppingCart} label={t({ tr: 'Kiosk & Kasa', en: 'Kiosk & POS' })} score={health.kiosk_score} detail={`${t({ tr: 'Çalışırlık', en: 'Uptime' })} %${health.kiosk_uptime_pct}`} />
              <Pillar icon={Wifi} label={t({ tr: 'Network', en: 'Network' })} score={health.network_score} detail={`${health.network_downtime_minutes} ${t({ tr: 'dk kesinti', en: 'min down' })}`} />
              <Pillar icon={Headphones} label={t({ tr: 'Yardım Masası', en: 'Help Desk' })} score={health.helpdesk_score} detail={`${health.helpdesk_call_count} ${t({ tr: 'çağrı', en: 'calls' })}`} />
            </div>
            {!!history?.length && (
              <div className="flex items-end gap-1.5 h-16 pt-2 border-t border-[var(--border)]">
                {history.map((h) => (
                  <div key={h.week_start} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${h.week_start}: ${h.composite_score}`}>
                    <div
                      className={`w-full rounded-t-sm ${h.letter_grade === 'A' ? 'bg-ok' : h.letter_grade === 'B' ? 'bg-p2' : 'bg-p1'}`}
                      style={{ height: `${Math.max(h.composite_score, 6)}%` }}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4">
          <div className="font-display text-2xl font-bold">{openIncidents}</div>
          <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Açık Talep', en: 'Open Tickets' })}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4">
          <div className="font-display text-2xl font-bold">
            {onlineAssets}<span className="text-[13px] font-normal text-[var(--text-faint)]">/{assets?.length ?? 0}</span>
          </div>
          <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Çevrimiçi Cihaz', en: 'Online Devices' })}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4">
          <div className="font-display text-2xl font-bold">{consumables?.length ?? 0}</div>
          <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Sarf/Aksesuar Kalemi', en: 'Consumable Items' })}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
          <h3 className="font-display text-[14px] font-bold flex items-center gap-1.5 mb-3">
            <Ticket className="w-4 h-4 text-brand-dim" />
            {t({ tr: 'Mağaza Talepleri', en: 'Store Tickets' })}
          </h3>
          <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
            {!incidents?.length && <p className="text-[12px] text-[var(--text-faint)] italic">{t({ tr: 'Kayıt yok.', en: 'No records.' })}</p>}
            {incidents?.map((i) => (
              <div key={i.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--row-hover)] text-[12px]">
                <span className={`text-[9.5px] font-bold rounded-full px-1.5 py-0.5 shrink-0 ${PRIORITY_STYLE[i.priority]}`}>{i.priority}</span>
                <span className="flex-1 min-w-0 truncate">{i.title}</span>
                <span className="text-[10.5px] text-[var(--text-faint)] shrink-0">{i.requester?.full_name?.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
          <h3 className="font-display text-[14px] font-bold flex items-center gap-1.5 mb-3">
            <Monitor className="w-4 h-4 text-brand-dim" />
            {t({ tr: 'Mağaza Cihazları', en: 'Store Devices' })}
          </h3>
          <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
            {!assets?.length && <p className="text-[12px] text-[var(--text-faint)] italic">{t({ tr: 'Kayıt yok.', en: 'No records.' })}</p>}
            {assets?.map((a) => (
              <div key={a.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--row-hover)] text-[12px]">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.is_online ? 'bg-ok' : 'bg-p1'}`} />
                <span className="flex-1 min-w-0 truncate">{a.name}</span>
                <span className="text-[10.5px] text-[var(--text-faint)] shrink-0">{a.ci_type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Pillar({
  icon: Icon,
  label,
  score,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  score: number
  detail: string
}) {
  const color = score >= 80 ? 'text-ok' : score >= 60 ? 'text-p2' : 'text-p1'
  return (
    <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
        <span className="text-[10.5px] font-bold text-[var(--text-faint)] truncate">{label}</span>
      </div>
      <div className={`font-display text-[17px] font-bold ${color}`}>{score}</div>
      <div className="text-[10px] text-[var(--text-faint)] mt-0.5">{detail}</div>
    </div>
  )
}
