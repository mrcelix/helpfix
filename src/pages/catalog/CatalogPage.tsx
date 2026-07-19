import { useState, useEffect } from 'react'
import { Package, Check, X, ShieldCheck } from 'lucide-react'
import { useLang, pickLang} from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { useOpenParam } from '@/hooks/useOpenParam'
import {
  useCategories,
  useCatalogItems,
  useServiceRequests,
  useUpdateServiceRequest,
  useBundles,
  useRequestBundle,
  useCurrentApprovalStages,
  useDecideRequestApproval,
  approverTypeLabel,
  type CatalogSavedView,
  type ServiceRequestItem,
  type CatalogItem,
  type RequestApproverType,
} from './useCatalog'
import { RequestServiceModal } from './RequestServiceModal'

const STATUS_LABEL: Record<string, { tr: string; en: string; fr?: string; it?: string; ar?: string }> = {
  submitted: { tr: 'Gönderildi', en: 'Submitted', fr: 'Soumis', it: 'Inviato', ar: 'تم الإرسال' },
  pending_approval: { tr: 'Onay Bekliyor', en: 'Pending Approval', fr: "En attente d'approbation", it: 'In attesa di approvazione', ar: 'بانتظار الموافقة' },
  approved: { tr: 'Onaylandı', en: 'Approved', fr: 'Approuvé', it: 'Approvato', ar: 'تمت الموافقة' },
  in_procurement: { tr: 'Tedarik Aşamasında', en: 'In Procurement', fr: "En cours d'achat", it: 'In fase di approvvigionamento', ar: 'قيد الشراء' },
  fulfilled: { tr: 'Karşılandı', en: 'Fulfilled', fr: 'Satisfait', it: 'Evaso', ar: 'تم التنفيذ' },
  rejected: { tr: 'Reddedildi', en: 'Rejected', fr: 'Rejeté', it: 'Rifiutato', ar: 'مرفوض' },
}

// StatusBadge (Badge.tsx) TicketStatus'a sabit tipli olduğundan servis
// talebi durumları için kullanılamıyor — aynı görsel dili (renkli pill)
// burada yerel olarak uyguluyoruz, önceden düz metindi (uygulamanın geri
// kalanındaki durum gösterimleriyle tutarsızdı).
const STATUS_PILL_STYLE: Record<string, string> = {
  submitted: 'bg-[var(--panel-2)] text-[var(--text-faint)]',
  pending_approval: 'bg-p2-tint text-p2',
  approved: 'bg-brand-tint text-brand-dim',
  in_procurement: 'bg-p3-tint text-[#8CA3FF]',
  fulfilled: 'bg-ok/15 text-ok',
  rejected: 'bg-p1-tint text-p1',
}

const SAVED_VIEWS: { key: CatalogSavedView; label: { tr: string; en: string; fr?: string; it?: string; ar?: string } }[] = [
  { key: 'all', label: { tr: 'Tümü', en: 'All', fr: 'Tous', it: 'Tutti', ar: 'الكل' } },
  { key: 'mine', label: { tr: 'Benim Taleplerim', en: 'My Requests', fr: 'Mes demandes', it: 'Le mie richieste', ar: 'طلباتي' } },
  { key: 'pending_approval', label: { tr: 'Onay Bekleyen', en: 'Pending Approval', fr: "En attente d'approbation", it: 'In attesa di approvazione', ar: 'بانتظار الموافقة' } },
  { key: 'fulfilled_this_month', label: { tr: 'Bu Ay Karşılanan', en: 'Fulfilled This Month', fr: 'Satisfaites ce mois-ci', it: 'Evase questo mese', ar: 'تم تنفيذها هذا الشهر' } },
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

  // Komut Paleti'nden (⌘K) "?open=<id>" ile bir katalog öğesine gelindiğinde
  // o öğeyi doğrudan açar — kategori filtresini kaldırarak öğenin listede
  // olmasını garanti eder.
  const openId = useOpenParam()
  useEffect(() => {
    if (openId) {
      setTab('browse')
      setActiveCategory(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])
  useEffect(() => {
    if (!openId || !items) return
    const found = items.find((i) => i.id === openId)
    if (found) setSelectedItem({ id: found.id, name: found.name, requiresApproval: found.requires_approval, formSchema: found.form_schema })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, items])
  const requestBundle = useRequestBundle()
  const [bundleSuccess, setBundleSuccess] = useState<number | null>(null)
  const [bundleError, setBundleError] = useState<string | null>(null)
  const { data: requests, isLoading: requestsLoading } = useServiceRequests(view)

  // Faz BD — bekleyen onaylı taleplerin GÜNCEL aşamasını tek sorguda çek
  const pendingApprovalIds = requests?.filter((r) => r.status === 'pending_approval').map((r) => r.id) ?? []
  const { data: currentStages } = useCurrentApprovalStages(pendingApprovalIds)
  const stageByRequest = new Map((currentStages ?? []).map((s) => [s.request_id, s]))

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-[22px] font-bold tracking-tight">
          {t({ tr: 'Servis Kataloğu', en: 'Service Catalog', fr: 'Catalogue de services', it: 'Catalogo servizi', ar: 'كتالوج الخدمات' })}
        </h1>
        <p className="text-[13px] text-[var(--text-faint)] mt-1">
          {t({ tr: 'Hizmet talep edin ve onay sürecini takip edin', en: 'Request services and track approvals', fr: 'Demandez des services et suivez les approbations', it: 'Richiedi servizi e monitora le approvazioni', ar: 'اطلب الخدمات وتابع الموافقات' })}
        </p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] mb-5 overflow-x-auto">
        <button
          onClick={() => setTab('browse')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${tab === 'browse' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Kataloğ', en: 'Catalog', fr: 'Catalogue', it: 'Catalogo', ar: 'الكتالوج' })}
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`px-1 py-2.5 text-[13.5px] font-semibold mr-5 border-b-2 ${tab === 'requests' ? 'border-brand text-brand-dim' : 'border-transparent text-[var(--text-faint)]'}`}
        >
          {t({ tr: 'Talepler', en: 'Requests', fr: 'Demandes', it: 'Richieste', ar: 'الطلبات' })}
        </button>
      </div>

      {tab === 'browse' && (
        <div>
          {!!bundles?.length && (
            <div className="mb-5">
              <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
                {t({ tr: 'Hizmet Paketleri', en: 'Service Bundles', fr: 'Offres groupées de services', it: 'Pacchetti di servizi', ar: 'حزم الخدمات' })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {bundles.map((b) => (
                  <div key={b.id} className="bg-purple-tint/40 border border-purple/40 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Package className="w-4 h-4 text-purple" />
                      <span className="font-bold text-[13px]">{b.name}</span>
                    </div>
                    {b.description && <p className="text-[11px] text-[var(--text-faint)] mb-3">{b.description}</p>}
                    <button
                      onClick={async () => {
                        setBundleError(null)
                        try {
                          const result = await requestBundle.mutateAsync(b.id)
                          setBundleSuccess(result.count)
                        } catch (err) {
                          setBundleError(err instanceof Error ? err.message : t({ tr: 'Paket talep edilemedi.', en: 'Failed to request bundle.' }))
                        }
                      }}
                      disabled={requestBundle.isPending}
                      className="w-full text-[11.5px] font-bold py-2 rounded-lg bg-purple text-white disabled:opacity-50"
                    >
                      {t({ tr: 'Paketi Talep Et', en: 'Request Bundle', fr: 'Demander le pack', it: 'Richiedi pacchetto', ar: 'طلب الحزمة' })}
                    </button>
                  </div>
                ))}
              </div>
              {bundleSuccess !== null && (
                <p className="text-[11.5px] text-ok mt-2">
                  ✓ {t({ tr: `${bundleSuccess} hizmet için ayrı talep oluşturuldu.`, en: `${bundleSuccess} separate requests created.`, fr: `${bundleSuccess} demandes distinctes créées.`, it: `${bundleSuccess} richieste separate create.`, ar: `تم إنشاء ${bundleSuccess} طلبات منفصلة.` })}
                </p>
              )}
              {bundleError && <p className="text-[11.5px] text-p1 mt-2">{bundleError}</p>}
            </div>
          )}

          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`text-[12px] font-bold px-3.5 py-2 rounded-full border ${!activeCategory ? 'bg-brand border-brand text-white' : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]'}`}
            >
              {t({ tr: 'Tümü', en: 'All', fr: 'Tous', it: 'Tutti', ar: 'الكل' })}
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

          {itemsLoading && <p className="text-[var(--text-faint)] text-sm py-8 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…', fr: 'Chargement…', it: 'Caricamento…', ar: 'جارٍ التحميل…' })}</p>}
          {!itemsLoading && items?.length === 0 && (
            <p className="text-[var(--text-faint)] text-sm py-14 text-center">
              {t({
                tr: 'Bu kategoride hizmet yok. Tenant Admin panelinden ekleyebilirsiniz.',
                en: 'No services in this category. Add some from the Tenant Admin panel.',
              })}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {items?.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedItem({ id: item.id, name: item.name, requiresApproval: item.requires_approval, formSchema: item.form_schema })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedItem({ id: item.id, name: item.name, requiresApproval: item.requires_approval, formSchema: item.form_schema })
                  }
                }}
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
                        ? t({ tr: 'Anında', en: 'Instant', fr: 'Instantané', it: 'Istantaneo', ar: 'فوري' })
                        : `${item.estimated_days} ${t({ tr: 'gün', en: 'days', fr: 'jours', it: 'giorni', ar: 'أيام' })}`}
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
                {pickLang(v.label, lang)}
              </button>
            ))}
          </div>

          <div className="border border-[var(--border)] rounded-[var(--radius-app)] overflow-x-auto bg-[var(--panel)]">
            <table className="w-full text-[12.5px] min-w-[720px]">
              <thead>
                <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
                  <Th>Ref</Th>
                  <Th>{t({ tr: 'Hizmet', en: 'Service', fr: 'Service', it: 'Servizio', ar: 'الخدمة' })}</Th>
                  <Th>{t({ tr: 'Talep Eden', en: 'Requester', fr: 'Demandeur', it: 'Richiedente', ar: 'مقدم الطلب' })}</Th>
                  <Th>{t({ tr: 'Durum', en: 'Status', fr: 'Statut', it: 'Stato', ar: 'الحالة' })}</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {requestsLoading && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-[var(--text-faint)]">
                      {t({ tr: 'Yükleniyor…', en: 'Loading…', fr: 'Chargement…', it: 'Caricamento…', ar: 'جارٍ التحميل…' })}
                    </td>
                  </tr>
                )}
                {!requestsLoading && requests?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-14 text-[var(--text-faint)]">
                      {t({ tr: 'Bu görünümde kayıt yok.', en: 'Nothing in this view.', fr: 'Aucun élément dans cette vue.', it: 'Nessun elemento in questa vista.', ar: 'لا توجد عناصر في هذا العرض.' })}
                    </td>
                  </tr>
                )}
                {requests?.map((r) => (
                  <RequestRow key={r.id} request={r} currentStage={stageByRequest.get(r.id)} />
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

function RequestRow({
  request,
  currentStage,
}: {
  request: ServiceRequestItem
  currentStage?: { id: string; stage: number; approver_type: RequestApproverType; approver_id: string | null }
}) {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const updateRequest = useUpdateServiceRequest(request.id)
  const decideApproval = useDecideRequestApproval(request.id)

  // Bu aşamayı karar verebilecek biri mi? RLS zaten server-side uyguluyor
  // (bkz. request_approvals_update, 0043) — burada AYNI kuralı tekrarlıyoruz
  // ki yetkisi olmayan biri "Onayla/Reddet" butonlarını hiç görmesin. Önceden
  // specific_user aşamasında approver_id hiç kontrol edilmiyordu (sorguya
  // dahil değildi), bu yüzden o talebi görebilen HERKESE buton gösteriliyordu
  // — tıklayınca RLS engelliyordu ama kullanıcıya hiçbir açıklama verilmiyordu.
  const canDecideStage =
    !!currentStage &&
    !!profile &&
    ((currentStage.approver_type === 'tenant_admin' && profile.role === 'tenant_admin') ||
      (currentStage.approver_type === 'department_manager' && ['manager', 'tenant_admin'].includes(profile.role)) ||
      (currentStage.approver_type === 'specific_user' && currentStage.approver_id === profile.id))

  return (
    <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--row-hover)]">
      <td className="px-3.5 py-3 font-mono text-[var(--text-faint)]">{request.ref}</td>
      <td className="px-3.5 py-3 font-semibold">{request.catalog_item?.name ?? '—'}</td>
      <td className="px-3.5 py-3 text-[var(--text-sub)]">{request.requester?.full_name ?? '—'}</td>
      <td className="px-3.5 py-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${STATUS_PILL_STYLE[request.status] ?? 'bg-[var(--panel-2)] text-[var(--text-faint)]'}`}>
          {(STATUS_LABEL[request.status] ? pickLang(STATUS_LABEL[request.status], lang) : undefined) ?? request.status}
        </span>
        {request.status === 'pending_approval' && currentStage && (
          <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-bold bg-p2-tint text-p2 rounded-full px-1.5 py-0.5">
            <ShieldCheck className="w-2.5 h-2.5" />
            {t({ tr: 'Aşama', en: 'Stage', fr: 'Étape', it: 'Fase', ar: 'المرحلة' })} {currentStage.stage}: {approverTypeLabel(currentStage.approver_type, lang)}
          </span>
        )}
      </td>
      <td className="px-3.5 py-3">
        {request.status === 'pending_approval' && canDecideStage && currentStage && (
          <div className="flex gap-1.5">
            <button
              onClick={() => decideApproval.mutate({ approvalId: currentStage.id, stage: currentStage.stage, decision: 'approved' })}
              className="flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-md bg-ok text-white"
            >
              <Check className="w-3 h-3" />
              {t({ tr: 'Onayla', en: 'Approve', fr: 'Approuver', it: 'Approva', ar: 'الموافقة' })}
            </button>
            <button
              onClick={() => decideApproval.mutate({ approvalId: currentStage.id, stage: currentStage.stage, decision: 'rejected' })}
              className="flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-md bg-[var(--panel-2)] border border-[var(--border)]"
            >
              <X className="w-3 h-3" />
              {t({ tr: 'Reddet', en: 'Reject', fr: 'Rejeter', it: 'Rifiuta', ar: 'رفض' })}
            </button>
          </div>
        )}
        {request.status === 'pending_approval' && !canDecideStage && (
          <span className="text-[10.5px] text-[var(--text-faint)] italic">
            {t({ tr: 'Başka bir onaylayıcı bekleniyor', en: 'Waiting on another approver', fr: "En attente d'un autre approbateur", it: 'In attesa di un altro approvatore', ar: 'بانتظار موافق آخر' })}
          </span>
        )}
        {request.status === 'approved' && (
          <button
            onClick={() => updateRequest.mutate({ status: 'fulfilled' })}
            className="text-[10.5px] font-bold px-2 py-1 rounded-md bg-brand text-white"
          >
            {t({ tr: 'Karşılandı Olarak İşaretle', en: 'Mark Fulfilled', fr: 'Marquer comme satisfait', it: 'Segna come evaso', ar: 'وضع علامة كمكتمل' })}
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
