import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket, LayoutGrid, BookOpen } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLang, pickLang} from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { useMyRequests } from '@/pages/service-desk/useIncidents'
import { StatusBadge } from '@/components/ui/Badge'
import { TodoWidget } from '@/components/widgets/TodoWidget'

function slaState(slaDueAt: string | null): 'ok' | 'warning' | 'breached' {
  if (!slaDueAt) return 'ok'
  const remainingMs = new Date(slaDueAt).getTime() - Date.now()
  if (remainingMs < 0) return 'breached'
  if (remainingMs < 4 * 3_600_000) return 'warning'
  return 'ok'
}

const SLA_STYLE: Record<string, string> = {
  ok: 'text-ok bg-[#0F2E1F]',
  warning: 'text-p2 bg-p2-tint',
  breached: 'text-p1 bg-p1-tint',
}
const SLA_LABEL: Record<string, { tr: string; en: string }> = {
  ok: { tr: 'Zamanında', en: 'On Track' },
  warning: { tr: 'Riskte', en: 'At Risk' },
  breached: { tr: 'Gecikti', en: 'Overdue' },
}

export function EmployeeHomePage() {
  const { lang, t } = useLang()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { data: myRequests, error: myRequestsError } = useMyRequests()

  const openCount = myRequests?.filter((r) => !['resolved', 'closed'].includes(r.status)).length ?? 0
  const resolvedCount = myRequests?.filter((r) => ['resolved', 'closed'].includes(r.status)).length ?? 0

  // Kişisel ortalama çözüm süresi — gerçek veriden hesaplanır.
  const avgResolutionDays = useMemo(() => {
    const resolved = myRequests?.filter((r) => r.resolved_at) ?? []
    if (!resolved.length) return null
    const total = resolved.reduce((sum, r) => sum + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()) / 86_400_000, 0)
    return Math.round((total / resolved.length) * 10) / 10
  }, [myRequests])

  // Son 6 ayda kaç talep açtığım — kişisel hacim mini grafiği.
  const monthlyVolume = useMemo(() => {
    const months: { key: string; label: string; count: number }[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      months.push({ key, label: d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short' }), count: 0 })
    }
    myRequests?.forEach((r) => {
      const d = new Date(r.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const bucket = months.find((m) => m.key === key)
      if (bucket) bucket.count += 1
    })
    return months
  }, [myRequests, lang])

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-[24px] font-bold tracking-tight">
          {t({ tr: `Merhaba, ${profile?.fullName?.split(' ')[0] ?? ''} 👋`, en: `Hi, ${profile?.fullName?.split(' ')[0] ?? ''} 👋`, fr: `Bonjour, ${profile?.fullName?.split(' ')[0] ?? ''} 👋`, it: `Ciao, ${profile?.fullName?.split(' ')[0] ?? ''} 👋`, ar: `مرحبًا، ${profile?.fullName?.split(' ')[0] ?? ''} 👋` })}
        </h1>
        <p className="text-[13.5px] text-[var(--text-faint)] mt-1">
          {t({ tr: 'Bugün size nasıl yardımcı olabiliriz?', en: 'How can we help you today?', fr: "Comment pouvons-nous vous aider aujourd'hui ?", it: 'Come possiamo aiutarti oggi?', ar: 'كيف يمكننا مساعدتك اليوم؟' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 hover:border-brand/40 transition-colors">
          <div className="font-display text-2xl font-bold">{openCount}</div>
          <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Açık Talebim', en: 'Open Tickets', fr: 'Tickets ouverts', it: 'Ticket aperti', ar: 'الطلبات المفتوحة' })}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 hover:border-ok/40 transition-colors">
          <div className="font-display text-2xl font-bold text-ok">{resolvedCount}</div>
          <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Çözülen Talebim', en: 'Resolved Tickets', fr: 'Tickets résolus', it: 'Ticket risolti', ar: 'الطلبات المحلولة' })}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 hover:border-brand/40 transition-colors">
          <div className="font-display text-2xl font-bold">{myRequests?.length ?? 0}</div>
          <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Toplam Talep', en: 'Total Tickets', fr: 'Total des tickets', it: 'Ticket totali', ar: 'إجمالي الطلبات' })}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 hover:border-brand/40 transition-colors">
          <div className="font-display text-2xl font-bold text-brand">
            {avgResolutionDays != null ? `${avgResolutionDays}${t({ tr: ' gün', en: 'd', fr: ' j', it: ' gg', ar: ' يوم' })}` : '—'}
          </div>
          <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Ort. Çözüm Süreniz', en: 'Avg. Resolution Time', fr: 'Délai de résolution moyen', it: 'Tempo medio di risoluzione', ar: 'متوسط وقت الحل' })}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        <ActionCard
          icon={Ticket}
          title={t({ tr: 'Yeni Talep Oluştur', en: 'Create a Ticket', fr: 'Créer un ticket', it: 'Crea un ticket', ar: 'إنشاء طلب' })}
          desc={t({ tr: 'Bir sorun mu var? Hemen bildirin.', en: 'Something wrong? Report it now.', fr: 'Un problème ? Signalez-le maintenant.', it: 'Qualcosa non va? Segnalalo subito.', ar: 'هل هناك مشكلة؟ أبلغ عنها الآن.' })}
          onClick={() => navigate('/my-tickets')}
        />
        <ActionCard
          icon={LayoutGrid}
          title={t({ tr: 'Servis Kataloğunu Gez', en: 'Browse Service Catalog', fr: 'Parcourir le catalogue de services', it: 'Sfoglia il catalogo servizi', ar: 'تصفح كتالوج الخدمات' })}
          desc={t({ tr: 'Donanım, yazılım ve daha fazlasını talep edin.', en: 'Request hardware, software, and more.', fr: 'Demandez du matériel, des logiciels et plus encore.', it: 'Richiedi hardware, software e altro.', ar: 'اطلب الأجهزة والبرامج والمزيد.' })}
          onClick={() => navigate('/catalog')}
        />
        <ActionCard
          icon={BookOpen}
          title={t({ tr: 'Bilgi Bankasında Ara', en: 'Search Knowledge Base', fr: 'Rechercher dans la base de connaissances', it: 'Cerca nella base di conoscenza', ar: 'ابحث في قاعدة المعرفة' })}
          desc={t({ tr: 'Sık sorulan sorulara kendiniz çözüm bulun.', en: 'Find answers to common questions yourself.', fr: 'Trouvez vous-même des réponses aux questions courantes.', it: 'Trova da solo le risposte alle domande frequenti.', ar: 'اعثر بنفسك على إجابات للأسئلة الشائعة.' })}
          onClick={() => navigate('/knowledge-base')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 mb-8">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5">
          <div className="text-[13px] font-bold mb-1">{t({ tr: 'Talep Hacminiz', en: 'Your Ticket Volume', fr: 'Votre volume de tickets', it: 'Il tuo volume di ticket', ar: 'حجم طلباتك' })}</div>
          <div className="text-[11px] text-[var(--text-faint)] mb-3">{t({ tr: 'Son 6 ay', en: 'Last 6 months', fr: 'Les 6 derniers mois', it: 'Ultimi 6 mesi', ar: 'آخر 6 أشهر' })}</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={monthlyVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} allowDecimals={false} width={24} />
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#17B0A7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <TodoWidget />
      </div>

      {myRequestsError && (
        <p className="text-p1 text-[12px] mb-4">{t({ tr: 'Taleplerim yüklenemedi.', en: 'Failed to load my tickets.' })}</p>
      )}
      {!!myRequests?.length && (
        <div>
          <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
            {t({ tr: 'Son Taleplerim', en: 'My Recent Tickets', fr: 'Mes tickets récents', it: 'I miei ticket recenti', ar: 'طلباتي الأخيرة' })}
          </div>
          <div className="space-y-1.5">
            {myRequests.slice(0, 5).map((r) => {
              const isOpen = !['resolved', 'closed'].includes(r.status)
              const state = slaState(r.sla_due_at)
              return (
                <div
                  key={r.id}
                  onClick={() => navigate('/my-tickets')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate('/my-tickets')
                    }
                  }}
                  className="flex items-center gap-3 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-4 py-3 cursor-pointer hover:border-brand"
                >
                  <span className="font-semibold text-[13px] flex-1 truncate">{r.title}</span>
                  <span className="font-mono text-[11px] text-[var(--text-faint)]">{r.ref}</span>
                  {isOpen && r.sla_due_at && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SLA_STYLE[state]}`}>
                      {pickLang(SLA_LABEL[state], lang)}
                    </span>
                  )}
                  <StatusBadge status={r.status} lang={lang} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ActionCard({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: typeof Ticket
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 hover:border-brand hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-tint flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-150">
        <Icon className="w-5 h-5 text-brand-dim" />
      </div>
      <div className="font-bold text-[13.5px] mb-1">{title}</div>
      <div className="text-[11.5px] text-[var(--text-faint)]">{desc}</div>
    </button>
  )
}
