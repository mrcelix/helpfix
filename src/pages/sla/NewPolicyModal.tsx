import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useLang } from '@/contexts/LangContext'
import { useCreatePolicy } from './useSla'
import { useSites } from '@/pages/admin/useSites'
import { priorityLabel } from '@/lib/priority'
import type { Priority } from '@/types/database'

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4']
const DEFAULTS: Record<Priority, { response: number; resolution: number }> = {
  P1: { response: 15, resolution: 240 },
  P2: { response: 30, resolution: 480 },
  P3: { response: 120, resolution: 1440 },
  P4: { response: 480, resolution: 4320 },
}

export function NewPolicyModal({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLang()
  const createPolicy = useCreatePolicy()
  const { data: sites } = useSites()

  const [name, setName] = useState('')
  const [priority, setPriority] = useState<Priority>('P2')
  const [category, setCategory] = useState('')
  const [siteId, setSiteId] = useState('')
  const [responseTime, setResponseTime] = useState(DEFAULTS.P2.response)
  const [resolutionTime, setResolutionTime] = useState(DEFAULTS.P2.resolution)
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false)
  const [tier, setTier] = useState<'sla' | 'ola' | 'uc'>('sla')

  function selectPriority(p: Priority) {
    setPriority(p)
    setResponseTime(DEFAULTS[p].response)
    setResolutionTime(DEFAULTS[p].resolution)
  }

  async function handleSubmit() {
    if (!name.trim()) return
    await createPolicy.mutateAsync({
      name: name.trim(),
      priority,
      category: category.trim() || null,
      site_id: siteId || null,
      response_time_minutes: responseTime,
      resolution_time_minutes: resolutionTime,
      businessHoursOnly,
      tier,
    })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t({ tr: 'Yeni SLA Politikası', en: 'New SLA Policy' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t({ tr: 'Vazgeç', en: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={createPolicy.isPending || !name.trim()}>
            {createPolicy.isPending ? t({ tr: 'Oluşturuluyor…', en: 'Creating…' }) : t({ tr: 'Politikayı Oluştur', en: 'Create Policy' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Politika Adı', en: 'Policy Name' })}
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t({ tr: 'örn. Standart Destek SLA', en: 'e.g. Standard Support SLA' })}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand"
          />
          <p className="text-[10.5px] text-[var(--text-faint)] mt-1.5">
            {t({ tr: 'Not: Her öncelik için sadece 1 aktif politika olabilir; yeni politika oluşturmak eskisini geçersiz kılmaz, ayrı olarak devre dışı bırakmanız gerekir.', en: 'Note: Only 1 active policy per priority; creating a new one doesn\'t auto-disable the old one.' })}
          </p>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Öncelik', en: 'Priority' })}
          </label>
          <div className="flex gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => selectPriority(p)}
                className={
                  'flex-1 text-[12px] font-bold py-2 rounded-lg border transition-colors ' +
                  (priority === p ? 'bg-brand border-brand text-white' : 'bg-[var(--panel-2)] border-[var(--border)] text-[var(--text-sub)]')
                }
              >
                {priorityLabel(p, lang)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Katman', en: 'Tier' })}
          </label>
          <div className="flex gap-1.5">
            {(['sla', 'ola', 'uc'] as const).map((tr) => (
              <button
                type="button"
                key={tr}
                onClick={() => setTier(tr)}
                className={`flex-1 text-[11px] font-bold py-2 rounded-lg border ${tier === tr ? 'bg-purple border-purple text-white' : 'bg-[var(--panel-2)] border-[var(--border)] text-[var(--text-sub)]'}`}
              >
                {tr.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-faint)] mt-1">
            {tier === 'sla'
              ? t({ tr: 'SLA: Müşteriyle yapılan hizmet anlaşması', en: 'SLA: Agreement with the customer' })
              : tier === 'ola'
                ? t({ tr: 'OLA: İç ekipler arası operasyonel anlaşma', en: 'OLA: Internal team-to-team agreement' })
                : t({ tr: 'UC: Tedarikçi ile taahhüt sözleşmesi', en: 'UC: Underpinning contract with a vendor' })}
          </p>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Kategori (opsiyonel)', en: 'Category (optional)' })}
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={t({ tr: 'örn. Ağ & VPN — boş bırakılırsa bu öncelik için genel politika olur', en: 'e.g. Network & VPN — leave blank for this priority\'s general policy' })}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-brand"
          />
          <p className="text-[10.5px] text-[var(--text-faint)] mt-1.5">
            {t({
              tr: 'Kategori girilirse, bu politika sadece o öncelik + kategori kombinasyonunda kullanılır ve genel politikadan daha spesifik sayılır (örn. P1 + "Ağ" için 30dk, P1 genel için 4s).',
              en: 'If set, this policy applies only to that priority + category combination and takes precedence over the general policy for that priority.',
            })}
          </p>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
            {t({ tr: 'Site (opsiyonel)', en: 'Site (optional)' })}
          </label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2.5 text-[13px]"
          >
            <option value="">{t({ tr: 'Tüm siteler', en: 'All sites' })}</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="text-[10.5px] text-[var(--text-faint)] mt-1.5">
            {t({
              tr: 'Site seçilirse, bu politika sadece o siteden gelen talepler için kullanılır ve genel politikadan daha spesifik sayılır.',
              en: 'If set, this policy applies only to tickets from that site and takes precedence over the general policy.',
            })}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Yanıt Süresi (dk)', en: 'Response Time (min)' })}
            </label>
            <input
              type="number"
              min={0}
              value={responseTime}
              onChange={(e) => setResponseTime(Number(e.target.value))}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">
              {t({ tr: 'Çözüm Süresi (dk)', en: 'Resolution Time (min)' })}
            </label>
            <input
              type="number"
              min={0}
              value={resolutionTime}
              onChange={(e) => setResolutionTime(Number(e.target.value))}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[12px] text-[var(--text-sub)]">
          <input type="checkbox" checked={businessHoursOnly} onChange={(e) => setBusinessHoursOnly(e.target.checked)} />
          {t({
            tr: 'Sadece mesai saatlerinde say (İş Takvimi sekmesindeki mesai + tatil günlerine göre)',
            en: 'Count business hours only (per the Business Calendar tab\'s hours + holidays)',
          })}
        </label>
      </div>
    </Modal>
  )
}
