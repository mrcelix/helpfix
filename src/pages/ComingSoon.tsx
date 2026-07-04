import { useLang } from '@/contexts/LangContext'

export function ComingSoonPage({ moduleName }: { moduleName: { tr: string; en: string } }) {
  const { t } = useLang()
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center mb-4 text-2xl">
        🚧
      </div>
      <h2 className="font-display font-bold text-lg mb-1">{t(moduleName)}</h2>
      <p className="text-[13px] text-[var(--text-faint)] max-w-sm">
        {t({
          tr: 'Bu modül henüz koda dökülmedi. Tasarımı 37 dosyalık mockup setinde mevcut — hangi modülün önce kodlanmasını istediğinizi belirtin.',
          en: "This module hasn't been coded yet. Its design exists in the 37-file mockup set — let us know which module to build next.",
        })}
      </p>
    </div>
  )
}
