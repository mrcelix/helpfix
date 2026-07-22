import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'

export function EmployeeHomePage() {
  const { t } = useLang()
  const { profile } = useAuth()

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

      <DashboardGrid surface="employee_home" />
    </div>
  )
}
