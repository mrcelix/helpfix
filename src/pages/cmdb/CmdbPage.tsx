import { useState, useEffect } from 'react'
import { useOpenParam } from '@/hooks/useOpenParam'
import { Plus, List, Share2, Download } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { useConfigurationItems, useDuplicateCis, type CiSavedView } from './useCmdb'
import { CiDrawer } from './CiDrawer'
import { NewCiModal } from './NewCiModal'
import { ServiceMap } from './ServiceMap'

const SAVED_VIEWS: { key: CiSavedView; label: { tr: string; en: string } }[] = [
  { key: 'all', label: { tr: 'Tümü', en: 'All' } },
  { key: 'mine', label: { tr: 'Bana Zimmetli', en: 'Assigned to Me' } },
  { key: 'warranty_expiring', label: { tr: 'Garantisi Bitenler', en: 'Warranty Expiring' } },
  { key: 'unassigned', label: { tr: 'Zimmetsiz', en: 'Unassigned' } },
]

const TYPE_LABEL: Record<string, { tr: string; en: string }> = {
  server: { tr: 'Sunucu', en: 'Server' },
  laptop: { tr: 'Dizüstü', en: 'Laptop' },
  desktop: { tr: 'Masaüstü', en: 'Desktop' },
  network_device: { tr: 'Ağ Cihazı', en: 'Network Device' },
  software_license: { tr: 'Yazılım Lisansı', en: 'Software License' },
  mobile_device: { tr: 'Mobil Cihaz', en: 'Mobile Device' },
  other: { tr: 'Diğer', en: 'Other' },
}

const STATUS_LABEL: Record<string, { tr: string; en: string }> = {
  active: { tr: 'Aktif', en: 'Active' },
  in_repair: { tr: 'Tamirde', en: 'In Repair' },
  retired: { tr: 'Emekli', en: 'Retired' },
  unmanaged: { tr: 'Yönetilmeyen', en: 'Unmanaged' },
}

function isWarrantySoon(dateStr: string | null) {
  if (!dateStr) return false
  const days = (new Date(dateStr).getTime() - Date.now()) / 86_400_000
  return days <= 60
}

export function CmdbPage() {
  const { lang, t } = useLang()
  const [view, setView] = useState<CiSavedView>('all')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const openId = useOpenParam()
  useEffect(() => { if (openId) setSelectedId(openId) }, [openId])
  const [showNewModal, setShowNewModal] = useState(false)

  const { data: items, isLoading, error } = useConfigurationItems(view)
  const { data: duplicates } = useDuplicateCis()
  const [sortBy, setSortBy] = useState<'created_desc' | 'warranty' | 'az'>('created_desc')

  const sortedItems = items ? [...items].sort((a, b) => {
    if (sortBy === 'warranty') {
      if (!a.warranty_expiry) return 1
      if (!b.warranty_expiry) return -1
      return new Date(a.warranty_expiry).getTime() - new Date(b.warranty_expiry).getTime()
    }
    if (sortBy === 'az') return a.name.localeCompare(b.name)
    return 0
  }) : items

  function exportCsv() {
    if (!sortedItems?.length) return
    const headers = ['Etiket', 'Ad', 'Tip', 'Zimmetli', 'Durum', 'Garanti']
    const rows = sortedItems.map((ci) => [
      ci.tag,
      ci.name,
      TYPE_LABEL[ci.ci_type]?.[lang] ?? ci.ci_type,
      ci.assigned_user?.full_name ?? '',
      STATUS_LABEL[ci.status]?.[lang] ?? ci.status,
      ci.warranty_expiry ? new Date(ci.warranty_expiry).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US') : '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'varliklar.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">
            {t({ tr: 'Varlık & CMDB', en: 'Assets & CMDB' })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">
            {t({ tr: 'Konfigürasyon öğeleri, garanti ve zimmet takibi', en: 'Configuration items, warranty, and assignment tracking' })}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-2 ${viewMode === 'list' ? 'bg-brand text-white' : 'bg-[var(--panel)] text-[var(--text-faint)]'}`}
            >
              <List className="w-[14px] h-[14px]" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-2.5 py-2 ${viewMode === 'map' ? 'bg-brand text-white' : 'bg-[var(--panel)] text-[var(--text-faint)]'}`}
            >
              <Share2 className="w-[14px] h-[14px]" />
            </button>
          </div>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="w-[15px] h-[15px]" />
            {t({ tr: 'Yeni Varlık', en: 'New Asset' })}
          </Button>
        </div>
      </div>

      {!!duplicates?.length && (
        <div className="bg-p2-tint border border-p2/40 rounded-xl p-3.5 mb-4">
          <div className="text-[11px] font-bold text-p2 uppercase mb-1.5">
            ⚠️ {t({ tr: 'Olası Yinelenen Varlıklar', en: 'Possible Duplicate Assets' })}
          </div>
          <p className="text-[12px] text-[var(--text-sub)]">
            {t({
              tr: `${duplicates.length} isim, birden fazla varlıkta tekrarlanıyor. Bunları gözden geçirip gereksiz kayıtları silmeyi düşünün: `,
              en: `${duplicates.length} name(s) appear on multiple assets. Consider reviewing and removing redundant records: `,
            })}
            <b>{duplicates.map((d) => d.name).join(', ')}</b>
          </p>
        </div>
      )}

      {viewMode === 'map' ? (
        <ServiceMap />
      ) : (
      <>
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {SAVED_VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={
              'text-[12.5px] font-bold px-3.5 py-2 rounded-lg border transition-colors ' +
              (view === v.key
                ? 'bg-brand border-brand text-white'
                : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]')
            }
          >
            {v.label[lang]}
          </button>
        ))}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="ml-auto text-[11.5px] font-semibold bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2.5 py-1.5"
        >
          <option value="created_desc">{t({ tr: 'Sırala: Varsayılan', en: 'Sort: Default' })}</option>
          <option value="warranty">{t({ tr: 'Sırala: Garanti Bitiş', en: 'Sort: Warranty Expiry' })}</option>
          <option value="az">{t({ tr: 'Sırala: A-Z', en: 'Sort: A-Z' })}</option>
        </select>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-sub)] hover:border-brand hover:text-brand-dim"
        >
          <Download className="w-[13px] h-[13px]" />
          {t({ tr: 'Dışa Aktar', en: 'Export' })}
        </button>
      </div>

      <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-hidden bg-[var(--panel)]">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
              <Th>{t({ tr: 'Etiket', en: 'Tag' })}</Th>
              <Th>{t({ tr: 'Ad', en: 'Name' })}</Th>
              <Th>{t({ tr: 'Tip', en: 'Type' })}</Th>
              <Th>{t({ tr: 'Zimmetli', en: 'Assigned To' })}</Th>
              <Th>{t({ tr: 'Durum', en: 'Status' })}</Th>
              <Th>{t({ tr: 'Garanti', en: 'Warranty' })}</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[var(--text-faint)]">
                  {t({ tr: 'Yükleniyor…', en: 'Loading…' })}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-p1">
                  {t({ tr: 'Bir hata oluştu.', en: 'Something went wrong.' })}
                </td>
              </tr>
            )}
            {!isLoading && !error && items?.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-14 text-[var(--text-faint)]">
                  {t({ tr: 'Bu görünümde kayıt yok.', en: 'Nothing in this view.' })}
                </td>
              </tr>
            )}
            {sortedItems?.map((ci) => (
              <tr
                key={ci.id}
                onClick={() => setSelectedId(ci.id)}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--row-hover)] cursor-pointer"
              >
                <td className="px-3.5 py-3 font-mono text-[var(--text-faint)]">{ci.tag}</td>
                <td className="px-3.5 py-3 font-semibold">{ci.name}</td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{TYPE_LABEL[ci.ci_type]?.[lang]}</td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">
                  {ci.assigned_user?.full_name ?? <span className="italic text-[var(--text-faint)]">—</span>}
                </td>
                <td className="px-3.5 py-3 text-[var(--text-sub)]">{STATUS_LABEL[ci.status]?.[lang]}</td>
                <td className={`px-3.5 py-3 ${isWarrantySoon(ci.warranty_expiry) ? 'text-p2 font-bold' : 'text-[var(--text-faint)]'}`}>
                  {ci.warranty_expiry
                    ? new Date(ci.warranty_expiry).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

      {selectedId && <CiDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
      {showNewModal && <NewCiModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">
      {children}
    </th>
  )
}
