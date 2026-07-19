import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, Plus, X, Link2, Ticket, AlertCircle, GitBranch, Radio } from 'lucide-react'
import { useLang, pickLang, type Lang } from '@/contexts/LangContext'
import {
  useBusinessServiceHealth,
  useServiceLinkedCis,
  useServiceLifecycle,
  useLinkCiToService,
  useUnlinkCiFromService,
  type BusinessServiceHealth,
  type ServiceCriticality,
} from './useBusinessServices'
import { useConfigurationItems } from './useCmdb'

const CRITICALITY_LABEL: Record<ServiceCriticality, { tr: string; en: string }> = {
  critical: { tr: 'Kritik', en: 'Critical' },
  high: { tr: 'Yüksek', en: 'High' },
  medium: { tr: 'Orta', en: 'Medium' },
  low: { tr: 'Düşük', en: 'Low' },
}

const HEALTH_STYLE: Record<string, { bg: string; text: string; label: { tr: string; en: string } }> = {
  operational: { bg: 'bg-ok/15', text: 'text-ok', label: { tr: 'Çalışıyor', en: 'Operational' } },
  degraded: { bg: 'bg-p2-tint', text: 'text-p2', label: { tr: 'Kısıtlı', en: 'Degraded' } },
  outage: { bg: 'bg-p1-tint', text: 'text-p1', label: { tr: 'Kesinti', en: 'Outage' } },
}

export function BusinessServicesTab() {
  const { lang, t } = useLang()
  const { data: services, isLoading, error } = useBusinessServiceHealth()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const outages = services?.filter((s) => s.health_status === 'outage').length ?? 0

  return (
    <div>
      {outages > 0 && (
        <div className="flex items-center gap-2.5 bg-p1-tint border border-p1/40 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle className="w-4 h-4 text-p1 shrink-0" />
          <span className="text-[12.5px] font-bold text-p1">
            {t({ tr: `${outages} hizmette kesinti var`, en: `${outages} service(s) experiencing an outage` })}
          </span>
        </div>
      )}

      {isLoading && <div className="text-[12px] text-[var(--text-faint)] py-10 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>}
      {error && (
        <div className="text-[12px] text-p1 py-10 text-center">{t({ tr: 'İş hizmetleri yüklenemedi.', en: 'Failed to load business services.' })}</div>
      )}
      {!isLoading && !error && !services?.length && (
        <div className="text-[12px] text-[var(--text-faint)] py-12 text-center px-6 border border-dashed border-[var(--border)] rounded-xl">
          {t({
            tr: 'Henüz iş hizmeti tanımlanmadı. "Yeni Hizmet" ile örn. "E-posta Hizmeti" veya "POS Sistemi" gibi bir iş hizmeti ekleyin, ardından onu oluşturan cihazları (CI) bağlayın.',
            en: 'No business services defined yet. Add one (e.g. "Email Service" or "POS System") with "New Service", then link the devices (CIs) that make it up.',
          })}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {services?.map((s) => {
          const isOpen = expandedId === s.service_id
          const style = HEALTH_STYLE[s.health_status]
          return (
            <div key={s.service_id} className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] overflow-hidden">
              <button onClick={() => setExpandedId(isOpen ? null : s.service_id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--row-hover)]">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.bg} ${style.text.replace('text-', 'bg-')}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold flex items-center gap-1.5">
                    {s.service_name}
                    <span className="text-[9px] font-bold bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text-faint)] rounded-full px-1.5 py-0.5">
                      {pickLang(CRITICALITY_LABEL[s.criticality], lang)}
                    </span>
                    {s.has_active_major_incident && (
                      <span
                        className="flex items-center gap-1 text-[9px] font-bold bg-p1-tint text-p1 rounded-full px-1.5 py-0.5"
                        title={t({ tr: 'Aktif büyük olay', en: 'Active major incident' })}
                      >
                        <Radio className="w-2.5 h-2.5 animate-pulse" />
                        {t({ tr: 'Büyük Olay', en: 'Major Incident' })}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--text-faint)] mt-0.5">
                    {s.owner_name ?? t({ tr: 'Sahibi atanmadı', en: 'No owner assigned' })} · {s.linked_ci_count} {t({ tr: 'bağlı cihaz', en: 'linked devices' })}
                    {s.open_incidents > 0 && ` · ${s.open_incidents} ${t({ tr: 'açık talep', en: 'open tickets' })}`}
                    {s.critical_open_incidents > 0 && (
                      <span className="text-p1 font-bold"> · {s.critical_open_incidents} {t({ tr: 'kritik', en: 'critical' })}</span>
                    )}
                  </div>
                </div>
                <span className={`text-[10.5px] font-bold rounded-full px-2.5 py-1 shrink-0 ${style.bg} ${style.text}`}>{pickLang(style.label, lang)}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-faint)] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--text-faint)] shrink-0" />}
              </button>
              {isOpen && <ServiceDetailPanel service={s} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ServiceDetailPanel({ service }: { service: BusinessServiceHealth }) {
  const { lang, t } = useLang()
  const { data: linkedCis } = useServiceLinkedCis(service.service_id)
  const { data: lifecycle } = useServiceLifecycle(service.service_id)
  const { data: allCis } = useConfigurationItems('all')
  const linkCi = useLinkCiToService()
  const unlinkCi = useUnlinkCiFromService()

  const [pickingCi, setPickingCi] = useState(false)
  const [ciToAdd, setCiToAdd] = useState('')

  const linkedIds = new Set(linkedCis?.map((c) => c.id))
  const availableCis = allCis?.filter((c) => !linkedIds.has(c.id))

  function addCi() {
    if (!ciToAdd) return
    linkCi.mutate({ serviceId: service.service_id, ciId: ciToAdd })
    setCiToAdd('')
    setPickingCi(false)
  }

  return (
    <div className="border-t border-[var(--border)] px-4 py-3.5 bg-[var(--panel-2)] space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide flex items-center gap-1.5">
            <Link2 className="w-3 h-3" />
            {t({ tr: 'Bağlı Cihazlar (Bağımlılık Haritası)', en: 'Linked Devices (Dependency Map)' })}
          </span>
          <button onClick={() => setPickingCi((p) => !p)} className="flex items-center gap-1 text-[10.5px] font-bold text-brand-dim">
            <Plus className="w-3 h-3" />
            {t({ tr: 'Cihaz Bağla', en: 'Link Device' })}
          </button>
        </div>
        {pickingCi && (
          <div className="flex items-center gap-1.5 mb-2">
            <select value={ciToAdd} onChange={(e) => setCiToAdd(e.target.value)} className="flex-1 text-[12px] bg-[var(--panel)] border border-[var(--border)] rounded-md px-2 py-1.5">
              <option value="">{t({ tr: 'Seçin…', en: 'Select…' })}</option>
              {availableCis?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.tag})
                </option>
              ))}
            </select>
            <button onClick={addCi} disabled={!ciToAdd} className="text-[11px] font-bold px-2.5 py-1.5 rounded-md bg-brand text-white disabled:opacity-40">
              {t({ tr: 'Ekle', en: 'Add' })}
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {!linkedCis?.length && <p className="text-[11px] text-[var(--text-faint)] italic">{t({ tr: 'Henüz cihaz bağlanmadı.', en: 'No devices linked yet.' })}</p>}
          {linkedCis?.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5 text-[11px] font-semibold bg-[var(--panel)] border border-[var(--border)] rounded-full pl-2.5 pr-1.5 py-1">
              <span className={`w-1.5 h-1.5 rounded-full ${c.is_online ? 'bg-ok' : 'bg-p1'}`} />
              {c.name}
              <button
                onClick={() => unlinkCi.mutate({ serviceId: service.service_id, ciId: c.id })}
                title={t({ tr: 'Bağlantıyı kaldır', en: 'Unlink' })}
                aria-label={t({ tr: 'Bağlantıyı kaldır', en: 'Unlink' })}
              >
                <X className="w-3 h-3 text-[var(--text-faint)] hover:text-p1" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <span className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide flex items-center gap-1.5 mb-2">
          <GitBranch className="w-3 h-3" />
          {t({ tr: 'Yaşam Döngüsü — Olay → Problem → Değişiklik', en: 'Lifecycle — Incident → Problem → Change' })}
        </span>
        <div className="grid grid-cols-3 gap-2">
          <LifecycleColumn icon={Ticket} label={t({ tr: 'Olaylar', en: 'Incidents' })} records={lifecycle?.incidents} lang={lang} />
          <LifecycleColumn icon={AlertCircle} label={t({ tr: 'Problemler', en: 'Problems' })} records={lifecycle?.problems} lang={lang} />
          <LifecycleColumn icon={GitBranch} label={t({ tr: 'Değişiklikler', en: 'Changes' })} records={lifecycle?.changes} lang={lang} />
        </div>
      </div>
    </div>
  )
}

function LifecycleColumn({
  icon: Icon,
  label,
  records,
  lang,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  records?: { id: string; ref: string; title: string }[]
  lang: Lang
}) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-2">
      <div className="flex items-center gap-1 mb-1.5">
        <Icon className="w-3 h-3 text-[var(--text-faint)]" />
        <span className="text-[10px] font-bold text-[var(--text-faint)] uppercase">{label}</span>
      </div>
      {!records?.length && <p className="text-[10.5px] text-[var(--text-faint)] italic">{lang === 'tr' ? 'Kayıt yok' : 'No records'}</p>}
      <div className="flex flex-col gap-1">
        {records?.slice(0, 4).map((r) => (
          <div key={r.id} className="text-[10.5px] truncate" title={r.title}>
            <span className="font-mono text-[var(--text-faint)]">{r.ref}</span> {r.title}
          </div>
        ))}
        {!!records?.length && records.length > 4 && (
          <div className="text-[10px] text-[var(--text-faint)] italic">
            {lang === 'tr' ? `+${records.length - 4} daha` : `+${records.length - 4} more`}
          </div>
        )}
      </div>
    </div>
  )
}
