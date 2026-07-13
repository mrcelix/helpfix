import { useLang, pickLang } from '@/contexts/LangContext'
import { useConfigurationItems } from '@/pages/cmdb/useCmdb'

const TYPE_LABEL: Record<string, { tr: string; en: string; fr?: string; it?: string; ar?: string }> = {
  server: { tr: 'Sunucu', en: 'Server', fr: 'Serveur', it: 'Server', ar: 'خادم' },
  laptop: { tr: 'Dizüstü', en: 'Laptop', fr: 'Ordinateur portable', it: 'Laptop', ar: 'حاسوب محمول' },
  desktop: { tr: 'Masaüstü', en: 'Desktop', fr: 'Ordinateur de bureau', it: 'Desktop', ar: 'حاسوب مكتبي' },
  network_device: { tr: 'Ağ Cihazı', en: 'Network Device', fr: 'Appareil réseau', it: 'Dispositivo di rete', ar: 'جهاز شبكة' },
  software_license: { tr: 'Yazılım Lisansı', en: 'Software License', fr: 'Licence logicielle', it: 'Licenza software', ar: 'ترخيص برمجي' },
  mobile_device: { tr: 'Mobil Cihaz', en: 'Mobile Device', fr: 'Appareil mobile', it: 'Dispositivo mobile', ar: 'جهاز محمول' },
  other: { tr: 'Diğer', en: 'Other', fr: 'Autre', it: 'Altro', ar: 'أخرى' },
}

export function MyAssetsPage() {
  const { lang, t } = useLang()
  const { data: items, isLoading } = useConfigurationItems('mine')

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-[22px] font-bold tracking-tight">{t({ tr: 'Varlıklarım', en: 'My Assets', fr: 'Mes actifs', it: 'I miei asset', ar: 'أصولي' })}</h1>
        <p className="text-[13px] text-[var(--text-faint)] mt-1">
          {t({ tr: 'Size zimmetli cihaz ve lisanslar', en: 'Devices and licenses assigned to you', fr: 'Appareils et licences qui vous sont attribués', it: 'Dispositivi e licenze a te assegnati', ar: 'الأجهزة والتراخيص المخصصة لك' })}
        </p>
      </div>

      {isLoading && <p className="text-[var(--text-faint)] text-sm py-8 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…', fr: 'Chargement…', it: 'Caricamento…', ar: 'جارٍ التحميل…' })}</p>}
      {!isLoading && items?.length === 0 && (
        <p className="text-[var(--text-faint)] text-sm py-14 text-center">
          {t({ tr: 'Size zimmetli bir varlık bulunmuyor.', en: 'No assets are currently assigned to you.', fr: 'Aucun actif ne vous est actuellement attribué.', it: 'Nessun asset è attualmente assegnato a te.', ar: 'لا توجد أصول مخصصة لك حاليًا.' })}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3.5">
        {items?.map((ci) => (
          <div key={ci.id} className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4">
            <div className="font-bold text-[13.5px] mb-1">{ci.name}</div>
            <div className="text-[11px] text-[var(--text-faint)] mb-3">{(TYPE_LABEL[ci.ci_type] ? pickLang(TYPE_LABEL[ci.ci_type], lang) : undefined)}</div>
            <div className="flex items-center justify-between text-[10.5px] text-[var(--text-faint)] font-mono">
              <span>{ci.tag}</span>
              {ci.warranty_expiry && (
                <span>{new Date(ci.warranty_expiry).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
