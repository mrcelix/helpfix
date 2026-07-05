import { useNavigate } from 'react-router-dom'
import { Ticket, LayoutGrid, BookOpen } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { useMyRequests } from '@/pages/service-desk/useIncidents'

export function EmployeeHomePage() {
  const { t } = useLang()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { data: myRequests } = useMyRequests()

  const openCount = myRequests?.filter((r) => !['resolved', 'closed'].includes(r.status)).length ?? 0
  const resolvedCount = myRequests?.filter((r) => ['resolved', 'closed'].includes(r.status)).length ?? 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-[24px] font-bold tracking-tight">
          {t({ tr: `Merhaba, ${profile?.fullName?.split(' ')[0] ?? ''} 👋`, en: `Hi, ${profile?.fullName?.split(' ')[0] ?? ''} 👋` })}
        </h1>
        <p className="text-[13.5px] text-[var(--text-faint)] mt-1">
          {t({ tr: 'Bugün size nasıl yardımcı olabiliriz?', en: 'How can we help you today?' })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3.5 mb-8">
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4">
          <div className="font-display text-2xl font-bold">{openCount}</div>
          <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Açık Talebim', en: 'Open Tickets' })}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4">
          <div className="font-display text-2xl font-bold text-ok">{resolvedCount}</div>
          <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Çözülen Talebim', en: 'Resolved Tickets' })}</div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4">
          <div className="font-display text-2xl font-bold">{myRequests?.length ?? 0}</div>
          <div className="text-[11px] text-[var(--text-faint)] mt-1">{t({ tr: 'Toplam Talep', en: 'Total Tickets' })}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        <ActionCard
          icon={Ticket}
          title={t({ tr: 'Yeni Talep Oluştur', en: 'Create a Ticket' })}
          desc={t({ tr: 'Bir sorun mu var? Hemen bildirin.', en: 'Something wrong? Report it now.' })}
          onClick={() => navigate('/my-tickets')}
        />
        <ActionCard
          icon={LayoutGrid}
          title={t({ tr: 'Servis Kataloğunu Gez', en: 'Browse Service Catalog' })}
          desc={t({ tr: 'Donanım, yazılım ve daha fazlasını talep edin.', en: 'Request hardware, software, and more.' })}
          onClick={() => navigate('/catalog')}
        />
        <ActionCard
          icon={BookOpen}
          title={t({ tr: 'Bilgi Bankasında Ara', en: 'Search Knowledge Base' })}
          desc={t({ tr: 'Sık sorulan sorulara kendiniz çözüm bulun.', en: 'Find answers to common questions yourself.' })}
          onClick={() => navigate('/knowledge-base')}
        />
      </div>

      {!!myRequests?.length && (
        <div className="mt-8">
          <div className="text-[10.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-2.5">
            {t({ tr: 'Son Taleplerim', en: 'My Recent Tickets' })}
          </div>
          <div className="space-y-1.5">
            {myRequests.slice(0, 3).map((r) => (
              <div
                key={r.id}
                onClick={() => navigate('/my-tickets')}
                className="flex items-center justify-between bg-[var(--panel)] border border-[var(--border)] rounded-xl px-4 py-3 cursor-pointer hover:border-brand"
              >
                <span className="font-semibold text-[13px]">{r.title}</span>
                <span className="font-mono text-[11px] text-[var(--text-faint)]">{r.ref}</span>
              </div>
            ))}
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
      className="text-left bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-5 hover:border-brand transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-tint flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-brand-dim" />
      </div>
      <div className="font-bold text-[13.5px] mb-1">{title}</div>
      <div className="text-[11.5px] text-[var(--text-faint)]">{desc}</div>
    </button>
  )
}
