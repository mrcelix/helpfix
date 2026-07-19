import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, X, TrendingDown } from 'lucide-react'
import { useLang, pickLang} from '@/contexts/LangContext'
import {
  useSoftwareLicenses,
  useLicenseSeatUsage,
  useLicenseAssignments,
  useAssignLicenseSeat,
  useRemoveLicenseSeat,
  type LicenseType,
} from './useSoftwareAssets'
import { useAssignableUsers } from '@/pages/oncall/useOnCall'
import { useConfigurationItems } from './useCmdb'

const TYPE_LABEL: Record<LicenseType, { tr: string; en: string }> = {
  subscription: { tr: 'Abonelik', en: 'Subscription' },
  perpetual: { tr: 'Kalıcı', en: 'Perpetual' },
  oem: { tr: 'OEM', en: 'OEM' },
  open_source: { tr: 'Açık Kaynak', en: 'Open Source' },
}

export function SoftwareLicensesTab() {
  const { lang, t } = useLang()
  const { data: licenses, isLoading, error } = useSoftwareLicenses()
  const { data: usage } = useLicenseSeatUsage()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const totalWasted = (licenses ?? []).reduce((sum, l) => {
    const used = usage?.get(l.id) ?? 0
    const idle = Math.max(l.total_seats - used, 0)
    return sum + idle * (l.cost_per_seat ?? 0)
  }, 0)

  const violations = (licenses ?? []).filter((l) => (usage?.get(l.id) ?? 0) > l.total_seats).length

  return (
    <div>
      {(totalWasted > 0 || violations > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {violations > 0 && (
            <div className="bg-p1-tint border border-p1/40 rounded-xl px-4 py-3">
              <div className="text-[12.5px] font-bold text-p1">
                {t({ tr: `${violations} lisans uyumsuz`, en: `${violations} licenses non-compliant` })}
              </div>
              <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
                {t({ tr: 'Kullanılan koltuk sayısı satın alınandan fazla — hukuki risk.', en: 'Used seats exceed purchased seats — legal risk.' })}
              </div>
            </div>
          )}
          {totalWasted > 0 && (
            <div className="bg-ok/10 border border-ok/30 rounded-xl px-4 py-3 flex items-center gap-2.5">
              <TrendingDown className="w-4 h-4 text-ok shrink-0" />
              <div>
                <div className="text-[12.5px] font-bold text-ok">
                  ₺{totalWasted.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')} {t({ tr: 'potansiyel tasarruf', en: 'potential savings' })}
                </div>
                <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
                  {t({ tr: 'Kullanılmayan koltukları geri alarak.', en: 'By reclaiming unused seats.' })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-[13px] text-[var(--text-faint)] py-10 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}
        {error && <p className="text-[13px] text-p1 py-10 text-center">{t({ tr: 'Lisanslar yüklenemedi.', en: 'Failed to load licenses.' })}</p>}
        {!isLoading && !error && !licenses?.length && (
          <p className="text-[13px] text-[var(--text-faint)] py-10 text-center">{t({ tr: 'Henüz lisans eklenmedi.', en: 'No licenses added yet.' })}</p>
        )}
        {licenses?.map((l) => {
          const used = usage?.get(l.id) ?? 0
          const pct = l.total_seats > 0 ? Math.min((used / l.total_seats) * 100, 100) : 0
          const isViolation = used > l.total_seats
          const isNearFull = !isViolation && pct >= 90
          const isOpen = expandedId === l.id
          return (
            <div key={l.id} className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] overflow-hidden">
              <button onClick={() => setExpandedId(isOpen ? null : l.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--row-hover)]">
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold flex items-center gap-1.5">
                    {l.name}
                    <span className="text-[9px] font-bold bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text-faint)] rounded-full px-1.5 py-0.5">
                      {pickLang(TYPE_LABEL[l.license_type], lang)}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-faint)] mt-0.5">
                    {l.vendor?.name ?? '—'}
                    {l.renewal_date && ` · ${t({ tr: 'Yenileme', en: 'Renewal' })}: ${new Date(l.renewal_date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}`}
                  </div>
                </div>
                <div className="w-32 shrink-0">
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className={isViolation ? 'text-p1' : isNearFull ? 'text-p2' : 'text-[var(--text-sub)]'}>
                      {used}/{l.total_seats}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--panel-2)] border border-[var(--border)] overflow-hidden">
                    <div className={`h-full ${isViolation ? 'bg-p1' : isNearFull ? 'bg-p2' : 'bg-ok'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-faint)] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--text-faint)] shrink-0" />}
              </button>
              {isOpen && <LicenseAssignmentsPanel licenseId={l.id} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LicenseAssignmentsPanel({ licenseId }: { licenseId: string }) {
  const { t } = useLang()
  const { data: assignments } = useLicenseAssignments(licenseId)
  const { data: users } = useAssignableUsers()
  const { data: cis } = useConfigurationItems('all')
  const assignSeat = useAssignLicenseSeat()
  const removeSeat = useRemoveLicenseSeat()

  const [targetType, setTargetType] = useState<'user' | 'ci'>('user')
  const [targetId, setTargetId] = useState('')

  function addSeat() {
    if (!targetId) return
    assignSeat.mutate({ licenseId, userId: targetType === 'user' ? targetId : null, ciId: targetType === 'ci' ? targetId : null })
    setTargetId('')
  }

  return (
    <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--panel-2)]">
      <div className="flex items-center gap-1.5 mb-3">
        <select
          value={targetType}
          onChange={(e) => {
            setTargetType(e.target.value as 'user' | 'ci')
            setTargetId('')
          }}
          className="text-[11.5px] font-semibold bg-[var(--panel)] border border-[var(--border)] rounded-md px-2 py-1.5"
        >
          <option value="user">{t({ tr: 'Kullanıcı', en: 'User' })}</option>
          <option value="ci">{t({ tr: 'Cihaz', en: 'Device' })}</option>
        </select>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="flex-1 text-[12px] bg-[var(--panel)] border border-[var(--border)] rounded-md px-2 py-1.5">
          <option value="">{t({ tr: 'Seçin…', en: 'Select…' })}</option>
          {targetType === 'user'
            ? users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))
            : cis?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.tag})
                </option>
              ))}
        </select>
        <button onClick={addSeat} disabled={!targetId || assignSeat.isPending} className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-md bg-brand text-white disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" />
          {t({ tr: 'Koltuk Ata', en: 'Assign Seat' })}
        </button>
      </div>
      {!assignments?.length && <p className="text-[11.5px] text-[var(--text-faint)] italic">{t({ tr: 'Henüz atanmış koltuk yok.', en: 'No seats assigned yet.' })}</p>}
      <div className="flex flex-col gap-1">
        {assignments?.map((a) => (
          <div key={a.id} className="flex items-center justify-between bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-1.5">
            <span className="text-[12px] font-medium">{a.user?.full_name ?? `${a.ci?.name} (${a.ci?.tag})`}</span>
            <button
              onClick={() => removeSeat.mutate(a.id)}
              title={t({ tr: 'Koltuğu kaldır', en: 'Remove seat' })}
              aria-label={t({ tr: 'Koltuğu kaldır', en: 'Remove seat' })}
              className="text-[var(--text-faint)] hover:text-p1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
