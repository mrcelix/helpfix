import { useState } from 'react'
import { Wrench, User, ExternalLink, Check } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { setStoredPanelChoice, type PanelChoice } from '@/lib/panelPreference'

/** Requester dışındaki roller (agent/manager/tenant_admin) hem
 * Yönetim & Servis Masası panelinin hem de Çalışan Merkezi'nin
 * (kendi taleplerini açabilecekleri kişisel portal) yetkisine sahip.
 * İlk girişte — ya da tercih hatırlanmadıysa her girişte — hangisine
 * gireceklerini seçmelerini sağlar; ikisini de aynı anda açabilirler. */
export function PanelChooserPage({ onChoose }: { onChoose: (choice: PanelChoice) => void }) {
  const { t } = useLang()
  const { profile } = useAuth()
  const [remember, setRemember] = useState(true)

  function choose(choice: PanelChoice) {
    if (remember) setStoredPanelChoice(choice)
    onChoose(choice)
  }

  function openInNewTab(choice: PanelChoice) {
    const url = new URL(window.location.origin + '/')
    url.searchParams.set('panel', choice)
    window.open(url.toString(), '_blank')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 py-10">
      <div className="absolute top-5 right-5">
        <LanguageSwitcher alwaysVisible />
      </div>

      <div className="w-full max-w-[640px]">
        <div className="text-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand to-brand-dim flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="white">
              <path d="M12 2 L14.5 8.5 L21 9 L16 13.5 L17.5 20 L12 16.5 L6.5 20 L8 13.5 L3 9 L9.5 8.5 Z" />
            </svg>
          </div>
          <h1 className="font-display text-[20px] font-bold mb-1.5">
            {t({ tr: `Hoş geldin, ${profile?.fullName?.split(' ')[0] ?? ''}`, en: `Welcome, ${profile?.fullName?.split(' ')[0] ?? ''}` })}
          </h1>
          <p className="text-[13px] text-[var(--text-faint)]">
            {t({
              tr: 'Birden fazla panele yetkin var — hangisiyle devam etmek istersin?',
              en: 'You have access to more than one panel — which would you like to open?',
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <PanelCard
            icon={Wrench}
            title={t({ tr: 'Yönetim & Servis Masası', en: 'Admin & Service Desk' })}
            desc={t({ tr: 'Talepleri yönetin, raporlayın, sistemi yapılandırın.', en: 'Manage tickets, report, and configure the system.' })}
            onEnter={() => choose('agent')}
            onNewTab={() => openInNewTab('agent')}
            t={t}
          />
          <PanelCard
            icon={User}
            title={t({ tr: 'Çalışan Merkezi', en: 'Employee Center' })}
            desc={t({ tr: 'Kendi taleplerinizi açın, kataloğu ve bilgi bankasını kullanın.', en: 'Open your own tickets, browse the catalog and knowledge base.' })}
            onEnter={() => choose('employee')}
            onNewTab={() => openInNewTab('employee')}
            t={t}
          />
        </div>

        <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border)] accent-brand"
          />
          <span className="text-[12.5px] text-[var(--text-sub)]">
            {t({ tr: 'Seçimimi hatırla, bir daha sorma', en: "Remember my choice, don't ask again" })}
          </span>
        </label>
      </div>
    </div>
  )
}

function PanelCard({
  icon: Icon,
  title,
  desc,
  onEnter,
  onNewTab,
  t,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  onEnter: () => void
  onNewTab: () => void
  t: (d: { tr: string; en: string }) => string
}) {
  return (
    <div className="border border-[var(--border)] rounded-2xl bg-[var(--panel)] p-5 flex flex-col hover:border-brand/50 transition-colors">
      <div className="w-11 h-11 rounded-xl bg-brand-tint flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-brand-dim" />
      </div>
      <h3 className="font-display text-[15px] font-bold mb-1.5">{title}</h3>
      <p className="text-[12px] text-[var(--text-faint)] leading-relaxed mb-5 flex-1">{desc}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={onEnter}
          className="flex-1 flex items-center justify-center gap-1.5 bg-brand text-white text-[12.5px] font-bold rounded-lg py-2.5 hover:bg-brand-dim transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {t({ tr: 'Bu Panele Gir', en: 'Enter This Panel' })}
        </button>
        <button
          onClick={onNewTab}
          title={t({ tr: 'Yeni sekmede aç', en: 'Open in new tab' })}
          className="w-[38px] h-[38px] shrink-0 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-faint)] hover:border-brand hover:text-brand-dim transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
