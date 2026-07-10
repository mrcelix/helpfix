import { useState } from 'react'
import { Trash2, Wifi, WifiOff } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { useLang } from '@/contexts/LangContext'
import { useCiDetail, useLinkedRecords, useUpdateCi, useConfigurationItems, useCiRelationships, useCreateRelationship, useDeleteRelationship } from './useCmdb'
import type { CiStatus } from '@/types/database'

const STATUS_OPTIONS: CiStatus[] = ['active', 'in_repair', 'retired', 'unmanaged']

export function CiDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { lang, t } = useLang()
  const { data: ci, isLoading } = useCiDetail(id)
  const { data: linked } = useLinkedRecords(id)
  const updateCi = useUpdateCi(id)
  const { data: allCis } = useConfigurationItems('all')
  const { data: relationships } = useCiRelationships(id)
  const createRelationship = useCreateRelationship()
  const deleteRelationship = useDeleteRelationship()
  const [targetCiId, setTargetCiId] = useState('')
  const [relType, setRelType] = useState<'depends_on' | 'hosted_on' | 'connected_to'>('depends_on')

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

          <div>
            <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Bağlantı Durumu', en: 'Connectivity' })}
            </label>
            <div className="flex items-center gap-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5">
              <button
                onClick={() => updateCi.mutate({ is_online: !ci.is_online, last_seen_at: new Date().toISOString() })}
                className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${ci.is_online ? 'bg-ok' : 'bg-p1'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${ci.is_online ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                {ci.is_online ? <Wifi className="w-3.5 h-3.5 text-ok" /> : <WifiOff className="w-3.5 h-3.5 text-p1" />}
                {ci.is_online ? t({ tr: 'Online', en: 'Online' }) : t({ tr: 'Offline', en: 'Offline' })}
              </span>
              <span className="text-[10.5px] text-[var(--text-faint)] ml-auto">
                {t({ tr: 'Son görülme:', en: 'Last seen:' })} {new Date(ci.last_seen_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
              </span>
            </div>
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
              {t({ tr: 'Servis Haritası İlişkileri', en: 'Service Map Relationships' })}
            </div>
            <div className="space-y-1.5 mb-2.5">
              {relationships?.map((r) => (
                <div key={r.id} className="flex items-center gap-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[11.5px]">
                  <span className="flex-1 truncate">
                    {r.source_ci_id === id ? (
                      <>
                        <b>{ci.name}</b> → {r.target?.name}
                      </>
                    ) : (
                      <>
                        {r.source?.name} → <b>{ci.name}</b>
                      </>
                    )}
                    <span className="text-[var(--text-faint)]"> ({r.relationship_type})</span>
                  </span>
                  <button onClick={() => deleteRelationship.mutate(r.id)} className="text-[var(--text-faint)] hover:text-p1 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {!relationships?.length && (
                <p className="text-[11.5px] text-[var(--text-faint)] italic">{t({ tr: 'Henüz ilişki yok', en: 'No relationships yet' })}</p>
              )}
            </div>
            <div className="flex gap-1.5">
              <select
                value={targetCiId}
                onChange={(e) => setTargetCiId(e.target.value)}
                className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[11.5px]"
              >
                <option value="">{t({ tr: 'Varlık seçin…', en: 'Select asset…' })}</option>
                {allCis?.filter((c) => c.id !== id).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value as typeof relType)}
                className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[11.5px]"
              >
                <option value="depends_on">depends_on</option>
                <option value="hosted_on">hosted_on</option>
                <option value="connected_to">connected_to</option>
              </select>
              <button
                onClick={() => targetCiId && createRelationship.mutate({ sourceCiId: id, targetCiId, relationshipType: relType })}
                disabled={!targetCiId}
                className="text-[11px] font-bold px-2.5 rounded-lg bg-brand text-white disabled:opacity-40 shrink-0"
              >
                +
              </button>
            </div>
          </div>

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
