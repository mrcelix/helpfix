import { pickLang, type Lang } from '@/contexts/LangContext'
import { Monitor, Wifi, AppWindow, KeyRound, Mail, ShieldAlert, HelpCircle, type LucideIcon } from 'lucide-react'

export interface TicketSubcategory {
  key: string
  label: { tr: string; en: string }
}

export interface TicketCategory {
  key: string
  label: { tr: string; en: string }
  icon: LucideIcon
  subcategories: TicketSubcategory[]
}

export const TICKET_CATEGORIES: TicketCategory[] = [
  {
    key: 'hardware',
    label: { tr: 'Donanım', en: 'Hardware' },
    icon: Monitor,
    subcategories: [
      { key: 'computer', label: { tr: 'Bilgisayar arızası', en: 'Computer malfunction' } },
      { key: 'printer', label: { tr: 'Yazıcı sorunu', en: 'Printer issue' } },
      { key: 'peripheral', label: { tr: 'Çevre birimi (fare/klavye)', en: 'Peripheral (mouse/keyboard)' } },
      { key: 'other-hardware', label: { tr: 'Diğer donanım', en: 'Other hardware' } },
    ],
  },
  {
    key: 'network',
    label: { tr: 'Ağ & VPN', en: 'Network & VPN' },
    icon: Wifi,
    subcategories: [
      { key: 'wifi', label: { tr: 'İnternet / Wi-Fi sorunu', en: 'Internet / Wi-Fi issue' } },
      { key: 'vpn', label: { tr: 'VPN bağlantı sorunu', en: 'VPN connection issue' } },
      { key: 'slow', label: { tr: 'Yavaş bağlantı', en: 'Slow connection' } },
      { key: 'other-network', label: { tr: 'Diğer ağ sorunu', en: 'Other network issue' } },
    ],
  },
  {
    key: 'software',
    label: { tr: 'Yazılım', en: 'Software' },
    icon: AppWindow,
    subcategories: [
      { key: 'crash', label: { tr: 'Uygulama çöküyor / hata veriyor', en: 'App crashing / erroring' } },
      { key: 'install', label: { tr: 'Kurulum / güncelleme talebi', en: 'Install / update request' } },
      { key: 'license', label: { tr: 'Lisans sorunu', en: 'License issue' } },
      { key: 'other-software', label: { tr: 'Diğer yazılım sorunu', en: 'Other software issue' } },
    ],
  },
  {
    key: 'access',
    label: { tr: 'Hesap & Erişim', en: 'Account & Access' },
    icon: KeyRound,
    subcategories: [
      { key: 'password', label: { tr: 'Şifre sıfırlama', en: 'Password reset' } },
      { key: 'permission', label: { tr: 'Yetki / erişim talebi', en: 'Permission / access request' } },
      { key: 'locked', label: { tr: 'Hesap kilitlendi', en: 'Account locked' } },
      { key: 'other-access', label: { tr: 'Diğer erişim sorunu', en: 'Other access issue' } },
    ],
  },
  {
    key: 'communication',
    label: { tr: 'E-posta & İletişim', en: 'Email & Communication' },
    icon: Mail,
    subcategories: [
      { key: 'email', label: { tr: 'E-posta gönderilemiyor / alınamıyor', en: 'Email not sending / receiving' } },
      { key: 'calendar', label: { tr: 'Takvim sorunu', en: 'Calendar issue' } },
      { key: 'meeting', label: { tr: 'Toplantı / görüntülü görüşme', en: 'Meeting / video call' } },
      { key: 'other-comm', label: { tr: 'Diğer iletişim sorunu', en: 'Other communication issue' } },
    ],
  },
  {
    key: 'security',
    label: { tr: 'Güvenlik', en: 'Security' },
    icon: ShieldAlert,
    subcategories: [
      { key: 'phishing', label: { tr: 'Şüpheli e-posta / phishing', en: 'Suspicious email / phishing' } },
      { key: 'malware', label: { tr: 'Virüs / zararlı yazılım şüphesi', en: 'Suspected virus / malware' } },
      { key: 'data-leak', label: { tr: 'Veri sızıntısı şüphesi', en: 'Suspected data leak' } },
      { key: 'other-security', label: { tr: 'Diğer güvenlik sorunu', en: 'Other security issue' } },
    ],
  },
  {
    key: 'other',
    label: { tr: 'Diğer', en: 'Other' },
    icon: HelpCircle,
    subcategories: [],
  },
]

/** Sihirbazın ürettiği "Kategori – Alt Kategori" metnini, tam eşleşen bir
 * taksonomi kaydına geri çözer — AI önerisi veya eski serbest metin bir
 * kategoriyle geldiğinde sihirbazda hangi adımda olunduğunu belirlemek için. */
export function resolveCategoryLabel(
  category: TicketCategory,
  subcategory: TicketSubcategory | null,
  lang: Lang
): string {
  return subcategory ? `${pickLang(category.label, lang)} – ${pickLang(subcategory.label, lang)}` : pickLang(category.label, lang)
}
