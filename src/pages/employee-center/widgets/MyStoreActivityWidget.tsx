import { Ticket, Monitor } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { priorityLabel } from '@/lib/priority'
import type { Priority } from '@/types/database'
import { useMyStoreIncidents, useMyStoreAssets } from '../useMyStore'
import { CI_TYPE_LABEL } from '@/pages/store-performance/CiAvailabilityTable'

const PRIORITY_STYLE: Record<string, string> = {
  P1: 'bg-p1-tint text-p1',
  P2: 'bg-p2-tint text-p2',
  P3: 'bg-brand-tint text-brand-dim',
  P4: 'bg-[var(--panel-2)] text-[var(--text-faint)]',
}

export function MyStoreActivityWidget() {
  const { lang, t } = useLang()
  const { data: incidents } = useMyStoreIncidents()
  const { data: assets } = useMyStoreAssets()

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4 flex flex-col overflow-hidden">
        <h3 className="font-display text-[14px] font-bold flex items-center gap-1.5 mb-3 shrink-0">
          <Ticket className="w-4 h-4 text-brand-dim" />
          {t({ tr: 'Mağaza Talepleri', en: 'Store Tickets', fr: 'Tickets du magasin', it: 'Ticket del negozio', ar: 'طلبات المتجر' })}
        </h3>
        <div className="flex flex-col gap-1.5 overflow-y-auto">
          {!incidents?.length && <p className="text-[12px] text-[var(--text-faint)] italic">{t({ tr: 'Kayıt yok.', en: 'No records.', fr: 'Aucun enregistrement.', it: 'Nessun record.', ar: 'لا توجد سجلات.' })}</p>}
          {incidents?.map((i) => (
            <div key={i.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--row-hover)] text-[12px]">
              <span
                className={`text-[9.5px] font-bold rounded-full px-1.5 py-0.5 shrink-0 ${PRIORITY_STYLE[i.priority]}`}
                title={priorityLabel(i.priority as Priority, lang)}
              >
                {i.priority}
              </span>
              <span className="flex-1 min-w-0 truncate">{i.title}</span>
              <span className="text-[10.5px] text-[var(--text-faint)] shrink-0">{i.requester?.full_name?.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4 flex flex-col overflow-hidden">
        <h3 className="font-display text-[14px] font-bold flex items-center gap-1.5 mb-3 shrink-0">
          <Monitor className="w-4 h-4 text-brand-dim" />
          {t({ tr: 'Mağaza Cihazları', en: 'Store Devices', fr: 'Appareils du magasin', it: 'Dispositivi del negozio', ar: 'أجهزة المتجر' })}
        </h3>
        <div className="flex flex-col gap-1.5 overflow-y-auto">
          {!assets?.length && <p className="text-[12px] text-[var(--text-faint)] italic">{t({ tr: 'Kayıt yok.', en: 'No records.', fr: 'Aucun enregistrement.', it: 'Nessun record.', ar: 'لا توجد سجلات.' })}</p>}
          {assets?.map((a) => (
            <div key={a.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--row-hover)] text-[12px]">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.is_online ? 'bg-ok' : 'bg-p1'}`} />
              <span className="flex-1 min-w-0 truncate">{a.name}</span>
              <span className="text-[10.5px] text-[var(--text-faint)] shrink-0">{t(CI_TYPE_LABEL[a.ci_type] ?? { tr: a.ci_type, en: a.ci_type })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
