import { useState } from 'react'
import { Trash2, Wifi, WifiOff, UserCheck, UserX, QrCode, History, Settings2 } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { useLang } from '@/contexts/LangContext'
import { useCiDetail, useLinkedRecords, useUpdateCi, useConfigurationItems, useCiRelationships, useCreateRelationship, useDeleteRelationship } from './useCmdb'
import { useCiCheckoutHistory, useCheckoutCi, useCheckinCi, useCiTypeFields, useSetCiTypeFields } from './useAssetOps'
import { useAssignableUsers } from '@/pages/oncall/useOnCall'
import { DynamicFieldsRenderer, FieldSchemaEditor } from '@/components/ui/DynamicFields'
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

  const { data: checkoutHistory } = useCiCheckoutHistory(id)
  const { data: users } = useAssignableUsers()
  const checkoutCi = useCheckoutCi()
  const checkinCi = useCheckinCi()
  const [checkoutUserId, setCheckoutUserId] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [editingFields, setEditingFields] = useState(false)

  const { data: typeFields } = useCiTypeFields(ci?.ci_type ?? null)
  const setTypeFields = useSetCiTypeFields()

  const openCheckout = checkoutHistory?.find((h) => !h.checked_in_at)

  const totalLinked = (linked?.incidents.length ?? 0) + (linked?.problems.length ?? 0) + (linked?.changes.length ?? 0)

  function handleCheckout() {
    if (!checkoutUserId) return
    checkoutCi.mutate({ ciId: id, userId: checkoutUserId })
    setCheckoutUserId('')
  }

  function handleCheckin() {
    if (!openCheckout) return
    checkinCi.mutate({ ciId: id, openHistoryId: openCheckout.id })
  }

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

          <div>
            <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Mağaza Sağlığı Kategorisi', en: 'Store Health Category' })}
            </label>
            <select
              value={ci.store_health_category ?? ''}
              onChange={(e) => updateCi.mutate({ store_health_category: (e.target.value || null) as 'esl' | 'kiosk_pos' | 'network' | 'other' | null })}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
            >
              <option value="">{t({ tr: 'Yok (skorlamaya dahil değil)', en: 'None (not part of scoring)' })}</option>
              <option value="esl">{t({ tr: 'ESL (Elektronik Raf Etiketi)', en: 'ESL (Electronic Shelf Label)' })}</option>
              <option value="kiosk_pos">{t({ tr: 'Kiosk & Mobil Kasa', en: 'Kiosk & Mobile POS' })}</option>
              <option value="network">{t({ tr: 'Network', en: 'Network' })}</option>
              <option value="other">{t({ tr: 'Diğer', en: 'Other' })}</option>
            </select>
            <p className="text-[10.5px] text-[var(--text-faint)] mt-1">
              {t({
                tr: 'Bu cihaz bir mağazaya bağlıysa, kategoriye göre Mağaza Performansı > Sağlık Skoru\'na dahil edilir.',
                en: "If this device is linked to a store, it's included in Store Performance > Health Score based on this category.",
              })}
            </p>
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
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Zimmet (Checkout/Checkin)', en: 'Checkout/Checkin' })}
            </label>
            {openCheckout ? (
              <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                    <UserCheck className="w-3.5 h-3.5 text-brand-dim" />
                    {openCheckout.checked_out_to?.full_name ?? '—'}
                  </span>
                  <button
                    onClick={handleCheckin}
                    disabled={checkinCi.isPending}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-[var(--panel)] border border-[var(--border)] hover:border-p1 hover:text-p1 disabled:opacity-40"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    {t({ tr: 'Geri Al', en: 'Check In' })}
                  </button>
                </div>
                <div className="text-[10.5px] text-[var(--text-faint)] mt-1">
                  {t({ tr: 'Teslim tarihi:', en: 'Checked out:' })} {new Date(openCheckout.checked_out_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <select
                  value={checkoutUserId}
                  onChange={(e) => setCheckoutUserId(e.target.value)}
                  className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]"
                >
                  <option value="">{t({ tr: 'Kişi seçin…', en: 'Select person…' })}</option>
                  {users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCheckout}
                  disabled={!checkoutUserId || checkoutCi.isPending}
                  className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-2 rounded-lg bg-brand text-white disabled:opacity-40 shrink-0"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {t({ tr: 'Teslim Et', en: 'Check Out' })}
                </button>
              </div>
            )}
            {!!checkoutHistory?.length && (
              <details className="mt-2">
                <summary className="text-[10.5px] font-bold text-[var(--text-faint)] cursor-pointer flex items-center gap-1">
                  <History className="w-3 h-3" />
                  {t({ tr: 'Zimmet Geçmişi', en: 'Checkout History' })} ({checkoutHistory.length})
                </summary>
                <div className="mt-1.5 space-y-1">
                  {checkoutHistory.map((h) => (
                    <div key={h.id} className="text-[11px] text-[var(--text-sub)] bg-[var(--panel-2)] rounded-md px-2.5 py-1.5">
                      <b>{h.checked_out_to?.full_name ?? '—'}</b> —{' '}
                      {new Date(h.checked_out_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                      {h.checked_in_at ? ` → ${new Date(h.checked_in_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}` : ` (${t({ tr: 'devam ediyor', en: 'ongoing' })})`}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          {(!!typeFields?.length || editingFields) && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide">
                  {t({ tr: 'Özel Alanlar', en: 'Custom Fields' })} ({ci.ci_type})
                </label>
                <button onClick={() => setEditingFields((e) => !e)} className="text-[var(--text-faint)] hover:text-brand-dim">
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {editingFields ? (
                <CiTypeFieldsEditor ciType={ci.ci_type} initialFields={typeFields ?? []} onSave={(f) => setTypeFields.mutate({ ciType: ci.ci_type, fields: f })} isPending={setTypeFields.isPending} />
              ) : (
                <div className="space-y-3">
                  <DynamicFieldsRenderer
                    fields={typeFields ?? []}
                    values={ci.custom_fields}
                    onChange={(key, value) => updateCi.mutate({ custom_fields: { ...ci.custom_fields, [key]: value } })}
                  />
                </div>
              )}
            </div>
          )}
          {!typeFields?.length && !editingFields && (
            <button onClick={() => setEditingFields(true)} className="flex items-center gap-1 text-[10.5px] font-bold text-brand-dim">
              <Settings2 className="w-3 h-3" />
              {t({ tr: `Bu tip için özel alan tanımla (${ci.ci_type})`, en: `Define custom fields for this type (${ci.ci_type})` })}
            </button>
          )}

          {ci.notes && (
            <div>
              <label className="block text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
                {t({ tr: 'Notlar', en: 'Notes' })}
              </label>
              <p className="text-[12.5px] text-[var(--text-sub)]">{ci.notes}</p>
            </div>
          )}

          <div>
            <button onClick={() => setShowQr((s) => !s)} className="flex items-center gap-1.5 text-[10.5px] font-bold text-[var(--text-faint)] hover:text-brand-dim uppercase tracking-wide">
              <QrCode className="w-3.5 h-3.5" />
              {t({ tr: 'QR Kod / Etiket', en: 'QR Code / Label' })}
            </button>
            {showQr && (
              <div className="mt-2 flex items-center gap-3 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/cmdb?open=${id}`)}`}
                  alt="QR"
                  width={100}
                  height={100}
                  className="rounded-md bg-white p-1"
                />
                <div className="text-[11.5px]">
                  <div className="font-mono font-bold">{ci.tag}</div>
                  <div className="text-[var(--text-faint)] mt-0.5">{ci.name}</div>
                  <p className="text-[10.5px] text-[var(--text-faint)] mt-1.5">
                    {t({ tr: 'Fiziksel etikette kullanılabilir — okutunca doğrudan bu kayda açılır.', en: 'Usable for physical labeling — scanning opens directly to this record.' })}
                  </p>
                </div>
              </div>
            )}
          </div>

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

function CiTypeFieldsEditor({
  ciType,
  initialFields,
  onSave,
  isPending,
}: {
  ciType: string
  initialFields: import('@/components/ui/DynamicFields').FormFieldSchema[]
  onSave: (fields: import('@/components/ui/DynamicFields').FormFieldSchema[]) => void
  isPending: boolean
}) {
  const { t } = useLang()
  const [fields, setFields] = useState(initialFields)

  return (
    <div>
      <p className="text-[10.5px] text-[var(--text-faint)] mb-2">
        {t({
          tr: `Bu alanlar "${ciType}" tipindeki TÜM varlıklarda görünür.`,
          en: `These fields apply to ALL assets of type "${ciType}".`,
        })}
      </p>
      <FieldSchemaEditor fields={fields} onChange={setFields} />
      <button
        onClick={() => onSave(fields)}
        disabled={isPending}
        className="mt-2.5 text-[11px] font-bold px-3 py-1.5 rounded-md bg-brand text-white disabled:opacity-40"
      >
        {isPending ? t({ tr: 'Kaydediliyor…', en: 'Saving…' }) : t({ tr: 'Kaydet', en: 'Save' })}
      </button>
    </div>
  )
}
