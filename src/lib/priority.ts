import { pickLang, type Lang } from '@/contexts/LangContext'
import type { Priority } from '@/types/database'

// Veritabanındaki P1-P4 kodları DEĞİŞMEDİ (SLA politikaları, otomasyon
// kuralları, filtreler hâlâ bu kodları kullanıyor) — sadece kullanıcıya
// gösterilen isimler değişti. P1 = en kritik, P4 = en düşük öncelik.
export const PRIORITY_LABEL: Record<Priority, { tr: string; en: string }> = {
  P1: { tr: 'Kritik', en: 'Critical' },
  P2: { tr: 'Acil', en: 'Urgent' },
  P3: { tr: 'Normal', en: 'Normal' },
  P4: { tr: 'Düşük', en: 'Low' },
}

export function priorityLabel(p: Priority, lang: Lang): string {
  return pickLang(PRIORITY_LABEL[p], lang)
}

export const PRIORITY_ORDER: Priority[] = ['P1', 'P2', 'P3', 'P4']
