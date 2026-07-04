import { Drawer } from '@/components/ui/Drawer'
import { useLang } from '@/contexts/LangContext'
import { useCiDetail, useLinkedRecords, useUpdateCi } from './useCmdb'
import type { CiStatus } from '@/types/database'

const STATUS_OPTIONS: CiStatus[] = ['active', 'in_repair', 'retired', 'unmanaged']

export function CiDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { lang, t } = useLang()
  const { data: ci, isLoading } = useCiDetail(id)
  const { data: linked } = useLinkedRecords(id)
  const updateCi = useUpdateCi(id)

  const totalLinked = (linked?.incidents.length ?? 0) + (linked?.problems.length ?? 0) + (linked?.changes.length ?? 0)

  return (
    <Drawer open onClose={onClose} title={ci?.name ?? '…'} subtitle={ci && <span className="font-mono">{ci.tag}</span>} widthClass="w-[460px]">
      {isLoading || !ci ? (
        <div className="text-[var(--text-faint)] text-sm py-10 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Durum', en: 'Status' })}
            </label>
            <select
              value={ci.status}
              onChange={(e) => updateCi.mutate({ status: e.target.value as CiStatus })}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <Field label={t({ tr: 'Seri No', en: 'Serial Number' })} value={ci.serial_number ?? '—'} mono />
            <Field label={t({ tr: 'Tedarikçi', en: 'Vendor' })} value={ci.vendor ?? '—'} />
            <Field
              label={t({ tr: 'Maliyet', en: 'Cost' })}
              value={ci.cost != null ? `₺${ci.cost.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}` : '—'}
            />
            <Field
              label={t({ tr: 'Garanti Bitiş', en: 'Warranty Expiry' })}
              value={ci.warranty_expiry ? new Date(ci.warranty_expiry).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US') : '—'}
            />
            <Field label={t({ tr: 'Zimmetli Kullanıcı', en: 'Assigned User' })} value={ci.assigned_user?.full_name ?? '—'} />
          </div>

          {ci.notes && (
            <div>
              <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                {t({ tr: 'Notlar', en: 'Notes' })}
              </label>
              <p className="text-[12.5px] text-[var(--text-sub)]">{ci.notes}</p>
            </div>
          )}

          <div>
            <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
              {t({ tr: 'Açık Kayıtlar', en: 'Open Records' })} ({totalLinked})
            </div>
            {totalLinked === 0 && (
              <p className="text-[11.5px] text-[var(--text-faint)] italic">
                {t({ tr: 'Bu varlığa bağlı kayıt yok', en: 'No records linked to this asset' })}
              </p>
            )}
            <div className="space-y-1.5">
              {linked?.incidents.map((r) => (
                <LinkRow key={r.id} refCode={r.ref} title={r.title} tag="INC" tagColor="text-p3" />
              ))}
              {linked?.problems.map((r) => (
                <LinkRow key={r.id} refCode={r.ref} title={r.title} tag="PRB" tagColor="text-purple" />
              ))}
              {linked?.changes.map((r) => (
                <LinkRow key={r.id} refCode={r.ref} title={r.title} tag="CHG" tagColor="text-p2" />
              ))}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1">{label}</div>
      <div className={`font-semibold ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}

function LinkRow({ refCode, title, tag, tagColor }: { refCode: string; title: string; tag: string; tagColor: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px]">
      <span className={`font-mono font-bold text-[10.5px] ${tagColor}`}>{tag}</span>
      <span className="font-mono text-[var(--text-faint)]">{refCode}</span>
      <span className="truncate flex-1">{title}</span>
    </div>
  )
}
