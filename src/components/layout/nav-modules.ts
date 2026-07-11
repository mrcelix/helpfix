import {
  LifeBuoy,
  CircleDot,
  GitBranch,
  LayoutGrid,
  Server,
  BookOpen,
  Clock,
  FolderKanban,
  BarChart3,
  Radar,
  PhoneCall,
  Sparkles,
  ShoppingCart,
  Store,
} from 'lucide-react'
import type { ComponentType } from 'react'

export interface NavModule {
  code: string
  path: string
  icon: ComponentType<{ className?: string }>
  name: { tr: string; en: string; fr: string; it: string; ar: string }
  badge?: 'beta'
}

// Mockup setinin Faz 1 (Navigasyon Birleştirme) denetiminde tüm modül
// dosyalarına aynı sırayla uygulanan kanonik liste. Buradan sapma
// olursa mockup'larla tutarsızlık oluşur — değiştirmeden önce iki kez düşünün.
export const NAV_MODULES: NavModule[] = [
  { code: 'service-desk', path: '/service-desk', icon: LifeBuoy, name: { tr: 'Servis Masası', en: 'Service Desk', fr: 'Service Desk', it: 'Service Desk', ar: 'مكتب الخدمة' } },
  { code: 'problems', path: '/problems', icon: CircleDot, name: { tr: 'Problem Yönetimi', en: 'Problem Mgmt', fr: 'Gestion des problèmes', it: 'Gestione problemi', ar: 'إدارة المشكلات' } },
  { code: 'changes', path: '/changes', icon: GitBranch, name: { tr: 'Değişiklik Yönetimi', en: 'Change Mgmt', fr: 'Gestion des changements', it: 'Gestione modifiche', ar: 'إدارة التغييرات' } },
  { code: 'catalog', path: '/catalog', icon: LayoutGrid, name: { tr: 'Servis Kataloğu', en: 'Service Catalog', fr: 'Catalogue de services', it: 'Catalogo servizi', ar: 'كتالوج الخدمات' } },
  { code: 'cmdb', path: '/cmdb', icon: Server, name: { tr: 'Varlık & CMDB', en: 'Assets & CMDB', fr: 'Actifs & CMDB', it: 'Asset & CMDB', ar: 'الأصول وقاعدة CMDB' } },
  { code: 'knowledge-base', path: '/knowledge-base', icon: BookOpen, name: { tr: 'Bilgi Yönetimi', en: 'Knowledge Base', fr: 'Base de connaissances', it: 'Base di conoscenza', ar: 'قاعدة المعرفة' } },
  { code: 'sla', path: '/sla', icon: Clock, name: { tr: 'SLA Yönetimi', en: 'SLA Mgmt', fr: 'Gestion des SLA', it: 'Gestione SLA', ar: 'إدارة اتفاقيات مستوى الخدمة' } },
  { code: 'projects', path: '/projects', icon: FolderKanban, name: { tr: 'Proje Yönetimi', en: 'Project Mgmt', fr: 'Gestion de projets', it: 'Gestione progetti', ar: 'إدارة المشاريع' } },
  { code: 'analytics', path: '/analytics', icon: BarChart3, name: { tr: 'Raporlama', en: 'Analytics', fr: 'Analytique', it: 'Analisi', ar: 'التحليلات' } },
  { code: 'monitoring', path: '/monitoring', icon: Radar, name: { tr: 'Olay/İzleme', en: 'Monitoring', fr: 'Surveillance', it: 'Monitoraggio', ar: 'المراقبة' } },
  { code: 'on-call', path: '/on-call', icon: PhoneCall, name: { tr: 'On-Call', en: 'On-Call', fr: 'Astreinte', it: 'Reperibilità', ar: 'المناوبة' } },
  { code: 'automation', path: '/automation', icon: Sparkles, name: { tr: 'AI Otomasyon', en: 'AI Automation', fr: 'Automatisation IA', it: 'Automazione IA', ar: 'الأتمتة بالذكاء الاصطناعي' }, badge: 'beta' },
  { code: 'purchasing', path: '/purchasing', icon: ShoppingCart, name: { tr: 'Sözleşme & Satın Alma', en: 'Contracts & Purchasing', fr: 'Contrats & Achats', it: 'Contratti & Acquisti', ar: 'العقود والمشتريات' } },
  { code: 'store-performance', path: '/store-performance', icon: Store, name: { tr: 'Mağaza Performansı', en: 'Store Performance', fr: 'Performance des magasins', it: 'Performance dei negozi', ar: 'أداء المتاجر' } },
]
