import { pickLang, type Lang } from '@/contexts/LangContext'
import { cn } from '@/lib/utils'
import type { Priority, TicketStatus } from '@/types/database'
import { PRIORITY_LABEL } from '@/lib/priority'

const PRIORITY_STYLES: Record<Priority, string> = {
  P1: 'bg-p1-tint text-p1',
  P2: 'bg-p2-tint text-p2',
  P3: 'bg-p3-tint text-[#8CA3FF]',
  P4: 'bg-p4-tint text-p4',
}

export function PriorityBadge({ priority, lang = 'tr' }: { priority: Priority; lang?: Lang }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold',
        PRIORITY_STYLES[priority]
      )}
    >
      {pickLang(PRIORITY_LABEL[priority], lang)}
    </span>
  )
}

export const STATUS_LABEL: Record<TicketStatus, { tr: string; en: string }> = {
  new: { tr: 'Yeni', en: 'New' },
  open: { tr: 'Açık', en: 'Open' },
  in_progress: { tr: 'İşlemde', en: 'In Progress' },
  on_hold: { tr: 'Beklemede', en: 'On Hold' },
  resolved: { tr: 'Çözüldü', en: 'Resolved' },
  closed: { tr: 'Kapatıldı', en: 'Closed' },
  merged: { tr: 'Birleştirildi', en: 'Merged' },
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  new: 'bg-[var(--panel-2)] text-[var(--text-sub)] border border-[var(--border)]',
  open: 'bg-p3-tint text-[#8CA3FF]',
  in_progress: 'bg-p2-tint text-p2',
  on_hold: 'bg-[var(--panel-2)] text-[var(--text-faint)] border border-[var(--border)]',
  resolved: 'bg-[#0F2E1F] text-ok',
  closed: 'bg-[var(--panel-2)] text-[var(--text-faint)] border border-[var(--border)]',
  merged: 'bg-purple-tint text-purple',
}

export function StatusBadge({ status, lang }: { status: TicketStatus; lang: Lang }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap',
        STATUS_STYLES[status]
      )}
    >
      {pickLang(STATUS_LABEL[status], lang)}
    </span>
  )
}
