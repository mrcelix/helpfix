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
  name: { tr: string; en: string }
  badge?: 'beta'
}

// Mockup setinin Faz 1 (Navigasyon Birleştirme) denetiminde tüm modül
// dosyalarına aynı sırayla uygulanan kanonik liste. Buradan sapma
// olursa mockup'larla tutarsızlık oluşur — değiştirmeden önce iki kez düşünün.
export const NAV_MODULES: NavModule[] = [
  { code: 'service-desk', path: '/service-desk', icon: LifeBuoy, name: { tr: 'Servis Masası', en: 'Service Desk' } },
  { code: 'problems', path: '/problems', icon: CircleDot, name: { tr: 'Problem Yönetimi', en: 'Problem Mgmt' } },
  { code: 'changes', path: '/changes', icon: GitBranch, name: { tr: 'Değişiklik Yönetimi', en: 'Change Mgmt' } },
  { code: 'catalog', path: '/catalog', icon: LayoutGrid, name: { tr: 'Servis Kataloğu', en: 'Service Catalog' } },
  { code: 'cmdb', path: '/cmdb', icon: Server, name: { tr: 'Varlık & CMDB', en: 'Assets & CMDB' } },
  { code: 'knowledge-base', path: '/knowledge-base', icon: BookOpen, name: { tr: 'Bilgi Yönetimi', en: 'Knowledge Base' } },
  { code: 'sla', path: '/sla', icon: Clock, name: { tr: 'SLA Yönetimi', en: 'SLA Mgmt' } },
  { code: 'projects', path: '/projects', icon: FolderKanban, name: { tr: 'Proje Yönetimi', en: 'Project Mgmt' } },
  { code: 'analytics', path: '/analytics', icon: BarChart3, name: { tr: 'Raporlama', en: 'Analytics' } },
  { code: 'monitoring', path: '/monitoring', icon: Radar, name: { tr: 'Olay/İzleme', en: 'Monitoring' } },
  { code: 'on-call', path: '/on-call', icon: PhoneCall, name: { tr: 'On-Call', en: 'On-Call' } },
  { code: 'automation', path: '/automation', icon: Sparkles, name: { tr: 'AI Otomasyon', en: 'AI Automation' }, badge: 'beta' },
  { code: 'purchasing', path: '/purchasing', icon: ShoppingCart, name: { tr: 'Sözleşme & Satın Alma', en: 'Contracts & Purchasing' } },
  { code: 'store-performance', path: '/store-performance', icon: Store, name: { tr: 'Mağaza Performansı', en: 'Store Performance' } },
]
