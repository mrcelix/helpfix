import { useState } from 'react'
import { Package } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import {
  useCategories,
  useCatalogItems,
  useServiceRequests,
  useUpdateServiceRequest,
  useBundles,
  useRequestBundle,
  type CatalogSavedView,
  type ServiceRequestItem,
  type CatalogItem,
} from './useCatalog'
import { RequestServiceModal } from './RequestServiceModal'

const STATUS_LABEL: Record<string, { tr: string; en: string }> = {
  submitted: { tr: 'Gönderildi', en: 'Submitted' },
  pending_approval: { tr: 'Onay Bekliyor', en: 'Pending Approval' },
  approved: { tr: 'Onaylandı', en: 'Approved' },
  in_procurement: { tr: 'Tedarik Aşamasında', en: 'In Procurement' },
  fulfilled: { tr: 'Karşılandı', en: 'Fulfilled' },
  rejected: { tr: 'Reddedildi', en: 'Rejected' },
}

const SAVED_VIEWS: { key: CatalogSavedView; label: { tr: string; en: string } }[] = [
  { key: 'all', label: { tr: 'Tümü', en: 'All' } },
  { key: 'mine', label: { tr: 'Benim Taleplerim', en: 'My Requests' } },
  { key: 'pending_approval', label: { tr: 'Onay Bekleyen', en: 'Pending Approval' } },
  { key: 'fulfilled_this_month', label: { tr: 'Bu Ay Karşılanan', en: 'Fulfilled This Month' } },
]

export function CatalogPage() {
  const { lang, t } = useLang()
  const [tab, setTab] = useState<'browse' | 'requests'>('browse')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; requiresApproval: boolean; formSchema: CatalogItem['form_schema'] } | null>(null)
  const [view, setView] = useState<CatalogSavedView>('all')

  const { data: categories } = useCategories()
  const { data: items, isLoading: itemsLoading } = useCatalogItems(activeCategory)
  const { data: bundles } = useBundles()
  const requestBundle = useRequestBundle()
  const [bundleSuccess, setBundleSuccess] = useState<number | null>(null)
  const { data: requests, isLoading: requestsLoading } = useServiceRequests(view)

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-[22px] font-bold tracking-tight">
          {t({ tr: 'Servis Kataloğu', en: 'Service Catalog' })}
        </h1>
        <p className="text-[13px] text-[var(--text-faint)] mt-1">
          {t({ tr: 'Hizmet talep edin ve onay sürecini takip edin', en: 'Request services and track approvals' })}
        </p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] mb-5">
        <button
          onClick={() => setTab('browse')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${tab === 'browse' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Kataloğ', en: 'Catalog' })}
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${tab === 'requests' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Talepler', en: 'Requests' })}
        </button>
      </div>

      {tab === 'browse' && (
        <div>
          {!!bundles?.length && (
            <div className="mb-5">
              <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
                {t({ tr: 'Hizmet Paketleri', en: 'Service Bundles' })}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {bundles.map((b) => (
                  <div key={b.id} className="bg-purple-tint/40 border border-purple/40 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Package className="w-4 h-4 text-purple" />
                      <span className="font-bold text-[13px]">{b.name}</span>
                    </div>
                    {b.description && <p className="text-[11px] text-[var(--text-faint)] mb-3">{b.description}</p>}
                    <button
                      onClick={async () => {
                        const result = await requestBundle.mutateAsync(b.id)
                        setBundleSuccess(result.count)
                      }}
                      disabled={requestBundle.isPending}
                      className="w-full text-[11.5px] font-bold py-2 rounded-lg bg-purple text-white disabled:opacity-50"
                    >
                      {t({ tr: 'Paketi Talep Et', en: 'Request Bundle' })}
                    </button>
                  </div>
                ))}
              </div>
              {bundleSuccess !== null && (
                <p className="text-[11.5px] text-ok mt-2">
                  ✓ {t({ tr: `${bundleSuccess} hizmet için ayrı talep oluşturuldu.`, en: `${bundleSuccess} separate requests created.` })}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`text-[12px] font-bold px-3.5 py-2 rounded-full border ${!activeCategory ? 'bg-brand border-brand text-white' : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]'}`}
            >
              {t({ tr: 'Tümü', en: 'All' })}
            </button>
            {categories?.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`text-[12px] font-bold px-3.5 py-2 rounded-full border ${activeCategory === c.id ? 'bg-brand border-brand text-white' : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]'}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {itemsLoading && <p className="text-[var(--text-faint)] text-sm py-8 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>}
          {!itemsLoading && items?.length === 0 && (
            <p className="text-[var(--text-faint)] text-sm py-14 text-center">
              {t({
                tr: 'Bu kategoride hizmet yok. Tenant Admin panelinden ekleyebilirsiniz.',
                en: 'No services in this category. Add some from the Tenant Admin panel.',
              })}
            </p>
          )}
          <div className="grid grid-cols-4 gap-3.5">
            {items?.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem({ id: item.id, name: item.name, requiresApproval: item.requires_approval, formSchema: item.form_schema })}
                className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 cursor-pointer hover:border-brand transition-colors"
              >
                <div className="font-bold text-[13px] mb-1">{item.name}</div>
                {item.description && (
                  <div className="text-[11px] text-[var(--text-faint)] mb-2 line-clamp-2">{item.description}</div>
                )}
                <div className="flex items-center gap-2 text-[10.5px] text-[var(--text-faint)]">
                  {item.estimated_days != null && (
                    <span>
                      {item.estimated_days === 0
                        ? t({ tr: 'Anında', en: 'Instant' })
                        : `${item.estimated_days} ${t({ tr: 'gün', en: 'days' })}`}
                    </span>
                  )}
                  {item.estimated_cost != null && (
                    <span>· ₺{item.estimated_cost.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <div>
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            {SAVED_VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`text-[12.5px] font-bold px-3.5 py-2 rounded-lg border transition-colors ${view === v.key ? 'bg-brand border-brand text-white' : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]'}`}
              >
                {v.label[lang]}
              </button>
            ))}
          </div>

          <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-hidden bg-[var(--panel)]">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
                  <Th>Ref</Th>
                  <Th>{t({ tr: 'Hizmet', en: 'Service' })}</Th>
                  <Th>{t({ tr: 'Talep Eden', en: 'Requester' })}</Th>
                  <Th>{t({ tr: 'Durum', en: 'Status' })}</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {requestsLoading && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-[var(--text-faint)]">
                      {t({ tr: 'Yükleniyor…', en: 'Loading…' })}
                    </td>
                  </tr>
                )}
                {!requestsLoading && requests?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-14 text-[var(--text-faint)]">
                      {t({ tr: 'Bu görünümde kayıt yok.', en: 'Nothing in this view.' })}
                    </td>
                  </tr>
                )}
                {requests?.map((r) => (
                  <RequestRow key={r.id} request={r} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedItem && <RequestServiceModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  )
}

function RequestRow({ request }: { request: ServiceRequestItem }) {
  const { lang, t } = useLang()
  const updateRequest = useUpdateServiceRequest(request.id)

  return (
    <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--row-hover)]">
      <td className="px-3.5 py-3 font-mono text-[var(--text-faint)]">{request.ref}</td>
      <td className="px-3.5 py-3 font-semibold">{request.catalog_item?.name ?? '—'}</td>
      <td className="px-3.5 py-3 text-[var(--text-sub)]">{request.requester?.full_name ?? '—'}</td>
      <td className="px-3.5 py-3 text-[var(--text-sub)]">{STATUS_LABEL[request.status]?.[lang] ?? request.status}</td>
      <td className="px-3.5 py-3">
        {request.status === 'pending_approval' && (
          <div className="flex gap-1.5">
            <button
              onClick={() => updateRequest.mutate({ status: 'approved' })}
              className="text-[10.5px] font-bold px-2 py-1 rounded-md bg-ok text-white"
            >
              {t({ tr: 'Onayla', en: 'Approve' })}
            </button>
            <button
              onClick={() => updateRequest.mutate({ status: 'rejected' })}
              className="text-[10.5px] font-bold px-2 py-1 rounded-md bg-[var(--panel-2)] border border-[var(--border)]"
            >
              {t({ tr: 'Reddet', en: 'Reject' })}
            </button>
          </div>
        )}
        {request.status === 'approved' && (
          <button
            onClick={() => updateRequest.mutate({ status: 'fulfilled' })}
            className="text-[10.5px] font-bold px-2 py-1 rounded-md bg-brand text-white"
          >
            {t({ tr: 'Karşılandı Olarak İşaretle', en: 'Mark Fulfilled' })}
          </button>
        )}
      </td>
    </tr>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">
      {children}
    </th>
  )
}
