import { useState } from 'react'
import { Plus, Trash2, Building2, Plug, Copy, Check, RefreshCw } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { useSites, useCreateSite, useDeleteSite, useRegenerateSiteToken } from './useSites'
import { useAssignableUsers } from '@/pages/oncall/useOnCall'

export function SitesTab() {
  const { t } = useLang()
  const { data: sites, isLoading } = useSites()
  const createSite = useCreateSite()
  const deleteSite = useDeleteSite()
  const regenerateToken = useRegenerateSiteToken()
  const { data: users } = useAssignableUsers()
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [isHq, setIsHq] = useState(false)
  const [parentSiteId, setParentSiteId] = useState('')
  const [managerId, setManagerId] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    await createSite.mutateAsync({
      name: name.trim(),
      city,
      address,
      isHeadquarters: isHq,
      parentSiteId: parentSiteId || null,
      managerId: managerId || null,
    })
    setName('')
    setCity('')
    setAddress('')
    setIsHq(false)
    setParentSiteId('')
    setManagerId('')
    setShowForm(false)
  }

  function handleDelete(id: string) {
    const confirmed = window.confirm(
      t({
        tr: 'Bu siteyi silmek istediğinize emin misiniz? Bu siteye atanmış kullanıcı/varlıkların site bağlantısı kaldırılır.',
        en: 'Delete this site? Users/assets assigned to it will have their site link removed.',
      })
    )
    if (confirmed) deleteSite.mutate(id)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] text-[var(--text-faint)]">
          {t({
            tr: 'Fiziksel şube/lokasyonlarınızı tanımlayın. Kullanıcı Yönetimi\'nden kişileri, Varlık & CMDB\'den cihazları bir siteye atayabilirsiniz. SLA politikaları ve iş takvimi (mesai saatleri) siteye özel tanımlanabilir.',
            en: 'Define your physical branches/locations. Assign people via User Management and devices via Assets & CMDB. SLA policies and business hours can be site-specific.',
          })}
        </p>
      </div>

      <Button onClick={() => setShowForm((s) => !s)} className="mb-3">
        <Plus className="w-[15px] h-[15px]" />
        {t({ tr: 'Yeni Site', en: 'New Site' })}
      </Button>

      {showForm && (
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius-app)] p-4 mb-4 space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t({ tr: 'Site adı (örn. İstanbul Merkez Ofis)', en: 'Site name (e.g. Istanbul HQ)' })}
            className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]"
          />
          <div className="grid grid-cols-2 gap-3">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t({ tr: 'Şehir', en: 'City' })} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]" />
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t({ tr: 'Adres (opsiyonel)', en: 'Address (optional)' })} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1">
                {t({ tr: 'Bağlı Olduğu Bölge (opsiyonel)', en: 'Parent Region (optional)' })}
              </label>
              <select value={parentSiteId} onChange={(e) => setParentSiteId(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]">
                <option value="">{t({ tr: 'Yok (bağımsız)', en: 'None (standalone)' })}</option>
                {sites?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-1">
                {t({ tr: 'Sorumlu Yönetici (opsiyonel)', en: 'Responsible Manager (optional)' })}
              </label>
              <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12.5px]">
                <option value="">{t({ tr: 'Yok', en: 'None' })}</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[10.5px] text-[var(--text-faint)] -mt-1.5">
            {t({
              tr: 'Bir siteyi bir bölgeye bağlarsanız ve o bölgenin sorumlu yöneticisini atarsanız, o yönetici Mağaza Performansı modülünde bağlı tüm mağazaları toplu görebilir.',
              en: "Linking a site to a region and assigning that region's manager lets them see all linked stores together in the Store Performance module.",
            })}
          </p>
          <label className="flex items-center gap-2 text-[12px] text-[var(--text-sub)]">
            <input type="checkbox" checked={isHq} onChange={(e) => setIsHq(e.target.checked)} />
            {t({ tr: 'Genel Merkez', en: 'Headquarters' })}
          </label>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={createSite.isPending || !name.trim()}>
              {t({ tr: 'Oluştur', en: 'Create' })}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              {t({ tr: 'Vazgeç', en: 'Cancel' })}
            </Button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-[12px] text-[var(--text-faint)]">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}
      {!isLoading && !sites?.length && <p className="text-[13px] text-[var(--text-faint)] py-6 text-center">{t({ tr: 'Henüz site eklenmedi.', en: 'No sites added yet.' })}</p>}

      <div className="flex flex-col gap-2">
        {sites?.map((s) => (
          <div key={s.id}>
            <div className="flex items-center gap-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-4 py-3">
              <Building2 className="w-4 h-4 text-brand-dim shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold flex items-center gap-1.5">
                  {s.name}
                  {s.is_headquarters && <span className="text-[9px] font-bold bg-brand-tint text-brand-dim rounded-full px-1.5 py-0.5">HQ</span>}
                </div>
                {(s.city || s.address) && <div className="text-[11.5px] text-[var(--text-faint)]">{[s.city, s.address].filter(Boolean).join(' · ')}</div>}
                <div className="text-[10.5px] text-[var(--text-faint)] mt-0.5 flex items-center gap-2">
                  {s.parent_site_id && (
                    <span>
                      {t({ tr: 'Bölge:', en: 'Region:' })} {sites?.find((p) => p.id === s.parent_site_id)?.name ?? '—'}
                    </span>
                  )}
                  {s.manager && <span>{t({ tr: 'Yönetici:', en: 'Manager:' })} {s.manager.full_name}</span>}
                </div>
              </div>
              <button
                onClick={() => setExpandedIntegration(expandedIntegration === s.id ? null : s.id)}
                title={t({ tr: 'Entegrasyon', en: 'Integration' })}
                className="p-1.5 rounded-md text-[var(--text-faint)] hover:text-brand-dim hover:bg-[var(--panel-2)] shrink-0"
              >
                <Plug className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(s.id)} className="text-[var(--text-faint)] hover:text-p1 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {expandedIntegration === s.id && (
              <SiteIntegrationPanel token={s.integration_token} onRegenerate={() => regenerateToken.mutate(s.id)} isRegenerating={regenerateToken.isPending} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SiteIntegrationPanel({ token, onRegenerate, isRegenerating }: { token: string; onRegenerate: () => void; isRegenerating: boolean }) {
  const { t } = useLang()
  const [copied, setCopied] = useState<'token' | 'url' | null>(null)
  const webhookUrl = `https://[PROJE-REF].supabase.co/functions/v1/store-health-integration?token=${token}`

  function copy(text: string, which: 'token' | 'url') {
    navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-[var(--panel-2)] border border-[var(--border)] border-t-0 rounded-b-lg px-4 py-3 -mt-2 pt-4">
      <p className="text-[11px] text-[var(--text-faint)] mb-2.5">
        {t({
          tr: 'Bu mağazanın ESL/Kiosk/Network izleme sistemi, aşağıdaki webhook URL\'sine cihaz durumu ve operasyonel olay (geç açılma vb.) gönderebilir. [PROJE-REF] kısmını kendi Supabase proje referansınızla değiştirin.',
          en: "This store's ESL/Kiosk/Network monitoring system can push device status and operational events (e.g. late opening) to the webhook URL below. Replace [PROJE-REF] with your own Supabase project reference.",
        })}
      </p>
      <div className="flex items-center gap-2 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-2 mb-2">
        <code className="flex-1 text-[11px] font-mono truncate">{webhookUrl}</code>
        <button onClick={() => copy(webhookUrl, 'url')} className="text-brand-dim shrink-0">
          {copied === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => copy(token, 'token')} className="flex items-center gap-1 text-[10.5px] font-bold text-[var(--text-faint)] hover:text-brand-dim">
          {copied === 'token' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {t({ tr: 'Token\'ı Kopyala', en: 'Copy Token' })}
        </button>
        <button onClick={onRegenerate} disabled={isRegenerating} className="flex items-center gap-1 text-[10.5px] font-bold text-p2 hover:text-p1 disabled:opacity-40">
          <RefreshCw className="w-3 h-3" />
          {t({ tr: 'Token\'ı Yenile (eskisini geçersiz kılar)', en: 'Regenerate Token (invalidates old one)' })}
        </button>
      </div>
    </div>
  )
}
