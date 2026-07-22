import { useNavigate } from 'react-router-dom'
import { Ticket, LayoutGrid, BookOpen } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'

export function QuickActionsWidget() {
  const { t } = useLang()
  const navigate = useNavigate()

  return (
    <div className="h-full grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
