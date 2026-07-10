import { useState } from 'react'
import { Plus, AlertTriangle, FileText, ShoppingCart, Building2 } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import {
  useContracts,
  usePurchaseOrders,
  useVendors,
  useUpdatePoStatus,
  contractHealth,
  PO_STATUS_LABEL,
  PO_STATUS_FLOW,
  type ContractType,
  type PoStatus,
} from './useProcurement'
import { NewContractModal } from './NewContractModal'
import { NewPurchaseOrderModal } from './NewPurchaseOrderModal'
import { NewVendorModal } from './NewVendorModal'

const CONTRACT_TYPE_LABEL: Record<ContractType, { tr: string; en: string }> = {
  service: { tr: 'Hizmet', en: 'Service' },
  license: { tr: 'Lisans', en: 'License' },
  maintenance: { tr: 'Bakım', en: 'Maintenance' },
  lease: { tr: 'Kiralama', en: 'Lease' },
  other: { tr: 'Diğer', en: 'Other' },
}

export function PurchasingPage() {
  const { lang, t } = useLang()
  const [tab, setTab] = useState<'contracts' | 'orders' | 'vendors'>('contracts')
  const [showNewContract, setShowNewContract] = useState(false)
  const [showNewPo, setShowNewPo] = useState(false)
  const [showNewVendor, setShowNewVendor] = useState(false)

  const { data: contracts } = useContracts()
  const { data: orders } = usePurchaseOrders()
  const { data: vendors } = useVendors()
  const updatePoStatus = useUpdatePoStatus()

  const expiringSoon = contracts?.filter((c) => contractHealth(c) === 'expiring_soon').length ?? 0
  const expired = contracts?.filter((c) => contractHealth(c) === 'expired').length ?? 0
  const openOrders = orders?.filter((o) => !['received', 'cancelled'].includes(o.status)).length ?? 0

  return (
    <div>
      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">{t({ tr: 'Sözleşme & Satın Alma', en: 'Contracts & Purchasing' })}</h1>
          <p className="text-[13px] text-[var(--text-faint)] mt-1">{t({ tr: 'Tedarikçiler, sözleşmeler ve satın alma siparişleri', en: 'Vendors, contracts, and purchase orders' })}</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'contracts' && (
            <Button onClick={() => setShowNewContract(true)}>
              <Plus className="w-[15px] h-[15px]" />
              {t({ tr: 'Yeni Sözleşme', en: 'New Contract' })}
            </Button>
          )}
          {tab === 'orders' && (
            <Button onClick={() => setShowNewPo(true)}>
              <Plus className="w-[15px] h-[15px]" />
              {t({ tr: 'Yeni Sipariş', en: 'New Order' })}
            </Button>
          )}
          {tab === 'vendors' && (
            <Button onClick={() => setShowNewVendor(true)}>
              <Plus className="w-[15px] h-[15px]" />
              {t({ tr: 'Yeni Tedarikçi', en: 'New Vendor' })}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label={t({ tr: 'Aktif Sözleşmeler', en: 'Active Contracts' })} value={contracts?.length ?? 0} accent="text-[var(--text)]" />
        <Kpi label={t({ tr: 'Yakında Bitecek', en: 'Expiring Soon' })} value={expiringSoon} accent="text-p2" />
        <Kpi label={t({ tr: 'Süresi Dolmuş', en: 'Expired' })} value={expired} accent="text-p1" />
        <Kpi label={t({ tr: 'Açık Siparişler', en: 'Open Orders' })} value={openOrders} accent="text-brand-dim" />
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] mb-4 overflow-x-auto">
        <TabButton icon={FileText} active={tab === 'contracts'} onClick={() => setTab('contracts')}>
          {t({ tr: 'Sözleşmeler', en: 'Contracts' })}
        </TabButton>
        <TabButton icon={ShoppingCart} active={tab === 'orders'} onClick={() => setTab('orders')}>
          {t({ tr: 'Satın Alma Siparişleri', en: 'Purchase Orders' })}
        </TabButton>
        <TabButton icon={Building2} active={tab === 'vendors'} onClick={() => setTab('vendors')}>
          {t({ tr: 'Tedarikçiler', en: 'Vendors' })}
        </TabButton>
      </div>

      {tab === 'contracts' && (
        <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-x-auto bg-[var(--panel)]">
          <table className="w-full text-[12.5px] min-w-[760px]">
            <thead>
              <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
                <Th>{t({ tr: 'Ref', en: 'Ref' })}</Th>
                <Th>{t({ tr: 'Ad', en: 'Name' })}</Th>
                <Th>{t({ tr: 'Tedarikçi', en: 'Vendor' })}</Th>
                <Th>{t({ tr: 'Tip', en: 'Type' })}</Th>
                <Th>{t({ tr: 'Bitiş Tarihi', en: 'End Date' })}</Th>
                <Th>{t({ tr: 'Maliyet', en: 'Cost' })}</Th>
                <Th>{t({ tr: 'Durum', en: 'Status' })}</Th>
              </tr>
            </thead>
            <tbody>
              {!contracts?.length && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[var(--text-faint)]">
                    {t({ tr: 'Henüz sözleşme yok.', en: 'No contracts yet.' })}
                  </td>
                </tr>
              )}
              {contracts?.map((c) => {
                const health = contractHealth(c)
                return (
                  <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3.5 py-3 font-mono text-[var(--text-faint)]">{c.ref}</td>
                    <td className="px-3.5 py-3 font-semibold">{c.name}</td>
                    <td className="px-3.5 py-3 text-[var(--text-sub)]">{c.vendor?.name ?? '—'}</td>
                    <td className="px-3.5 py-3 text-[var(--text-sub)]">{CONTRACT_TYPE_LABEL[c.contract_type][lang]}</td>
                    <td className="px-3.5 py-3 text-[var(--text-sub)]">{new Date(c.end_date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}</td>
                    <td className="px-3.5 py-3 text-[var(--text-sub)]">{c.cost != null ? `₺${c.cost.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}` : '—'}</td>
                    <td className="px-3.5 py-3">
                      {health === 'expired' && (
                        <span className="flex items-center gap-1 text-[10.5px] font-bold bg-p1-tint text-p1 rounded-full px-2 py-0.5 w-fit">
                          <AlertTriangle className="w-3 h-3" />
                          {t({ tr: 'Süresi Doldu', en: 'Expired' })}
                        </span>
                      )}
                      {health === 'expiring_soon' && (
                        <span className="flex items-center gap-1 text-[10.5px] font-bold bg-p2-tint text-p2 rounded-full px-2 py-0.5 w-fit">
                          <AlertTriangle className="w-3 h-3" />
                          {t({ tr: 'Yakında Bitiyor', en: 'Expiring Soon' })}
                        </span>
                      )}
                      {health === 'active' && (
                        <span className="text-[10.5px] font-bold bg-ok/15 text-ok rounded-full px-2 py-0.5 w-fit inline-block">
                          {t({ tr: 'Aktif', en: 'Active' })}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'orders' && (
        <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-x-auto bg-[var(--panel)]">
          <table className="w-full text-[12.5px] min-w-[760px]">
            <thead>
              <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
                <Th>{t({ tr: 'Ref', en: 'Ref' })}</Th>
                <Th>{t({ tr: 'Başlık', en: 'Title' })}</Th>
                <Th>{t({ tr: 'Tedarikçi', en: 'Vendor' })}</Th>
                <Th>{t({ tr: 'Talep Eden', en: 'Requester' })}</Th>
                <Th>{t({ tr: 'Tutar', en: 'Amount' })}</Th>
                <Th>{t({ tr: 'Durum', en: 'Status' })}</Th>
                <Th>{t({ tr: 'Aksiyon', en: 'Action' })}</Th>
              </tr>
            </thead>
            <tbody>
              {!orders?.length && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[var(--text-faint)]">
                    {t({ tr: 'Henüz sipariş yok.', en: 'No orders yet.' })}
                  </td>
                </tr>
              )}
              {orders?.map((o) => {
                const flowIdx = PO_STATUS_FLOW.indexOf(o.status)
                const nextStatus = flowIdx >= 0 && flowIdx < PO_STATUS_FLOW.length - 1 ? PO_STATUS_FLOW[flowIdx + 1] : null
                return (
                  <tr key={o.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3.5 py-3 font-mono text-[var(--text-faint)]">{o.ref}</td>
                    <td className="px-3.5 py-3 font-semibold">{o.title}</td>
                    <td className="px-3.5 py-3 text-[var(--text-sub)]">{o.vendor?.name ?? '—'}</td>
                    <td className="px-3.5 py-3 text-[var(--text-sub)]">{o.requester?.full_name ?? '—'}</td>
                    <td className="px-3.5 py-3 text-[var(--text-sub)]">₺{o.total_cost.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</td>
                    <td className="px-3.5 py-3">
                      <PoStatusBadge status={o.status} />
                    </td>
                    <td className="px-3.5 py-3">
                      {nextStatus && o.status !== 'cancelled' && (
                        <button
                          onClick={() => updatePoStatus.mutate({ id: o.id, status: nextStatus as PoStatus })}
                          className="text-[10.5px] font-bold px-2.5 py-1 rounded-md bg-brand text-white"
                        >
                          {PO_STATUS_LABEL[nextStatus][lang]} →
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'vendors' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!vendors?.length && <p className="text-[13px] text-[var(--text-faint)] py-10 text-center col-span-2">{t({ tr: 'Henüz tedarikçi yok.', en: 'No vendors yet.' })}</p>}
          {vendors?.map((v) => (
            <div key={v.id} className="border border-[var(--border)] rounded-[var(--radius-app)] bg-[var(--panel)] p-4">
              <div className="font-semibold text-[14px] mb-1">{v.name}</div>
              {v.contact_name && <div className="text-[12px] text-[var(--text-sub)]">{v.contact_name}</div>}
              {v.contact_email && <div className="text-[12px] text-[var(--text-faint)]">{v.contact_email}</div>}
              {v.contact_phone && <div className="text-[12px] text-[var(--text-faint)]">{v.contact_phone}</div>}
            </div>
          ))}
        </div>
      )}

      {showNewContract && <NewContractModal onClose={() => setShowNewContract(false)} />}
      {showNewPo && <NewPurchaseOrderModal onClose={() => setShowNewPo(false)} />}
      {showNewVendor && <NewVendorModal onClose={() => setShowNewVendor(false)} />}
    </div>
  )
}

function PoStatusBadge({ status }: { status: PoStatus }) {
  const { lang } = useLang()
  const colors: Record<PoStatus, string> = {
    draft: 'bg-[var(--panel-2)] text-[var(--text-faint)]',
    pending_approval: 'bg-p2-tint text-p2',
    approved: 'bg-brand-tint text-brand-dim',
    ordered: 'bg-purple-tint text-purple',
    received: 'bg-ok/15 text-ok',
    cancelled: 'bg-p1-tint text-p1',
  }
  return <span className={`text-[10.5px] font-bold rounded-full px-2 py-0.5 w-fit inline-block ${colors[status]}`}>{PO_STATUS_LABEL[status][lang]}</span>
}

function Kpi({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4">
      <div className={`font-display text-2xl font-bold ${accent}`}>{value}</div>
      <div className="text-[11px] text-[var(--text-faint)] mt-1">{label}</div>
    </div>
  )
}

function TabButton({
  icon: Icon,
  active,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${active ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] font-semibold px-3.5 py-2.5">{children}</th>
}
