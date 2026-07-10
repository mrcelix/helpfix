import { useState } from 'react'
import { Plus, Trash2, Building2 } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { useSites, useCreateSite, useDeleteSite } from './useSites'

export function SitesTab() {
  const { t } = useLang()
  const { data: sites, isLoading } = useSites()
  const createSite = useCreateSite()
  const deleteSite = useDeleteSite()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [isHq, setIsHq] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    await createSite.mutateAsync({ name: name.trim(), city, address, isHeadquarters: isHq })
    setName('')
    setCity('')
    setAddress('')
    setIsHq(false)
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
          <div key={s.id} className="flex items-center gap-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-4 py-3">
            <Building2 className="w-4 h-4 text-brand-dim shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold flex items-center gap-1.5">
                {s.name}
                {s.is_headquarters && <span className="text-[9px] font-bold bg-brand-tint text-brand-dim rounded-full px-1.5 py-0.5">HQ</span>}
              </div>
              {(s.city || s.address) && <div className="text-[11.5px] text-[var(--text-faint)]">{[s.city, s.address].filter(Boolean).join(' · ')}</div>}
            </div>
            <button onClick={() => handleDelete(s.id)} className="text-[var(--text-faint)] hover:text-p1 shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
