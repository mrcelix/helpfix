import type { LucideIcon } from 'lucide-react'

/** BT Sağlık Skoru'nun 4 sütunundan (ESL/Kiosk & Mobil Kasa/Network/
 * Yardım Masası) her biri için tek kart. HealthScoreTab (yönetici) ve
 * MyStorePage (çalışan) PAYLAŞIR — önceden ikisinde de birebir aynı
 * kopya kod olarak duruyordu. `onClick` verilirse tıklanabilir olur
 * (detay popup'ı açar) — verilmezse düz bilgi kartı olarak kalır. */
export function Pillar({
  icon: Icon,
  label,
  score,
  detail,
  onClick,
}: {
  icon: LucideIcon
  label: string
  score: number
  detail: string
  onClick?: () => void
}) {
  const color = score >= 80 ? 'text-ok' : score >= 60 ? 'text-p2' : 'text-p1'
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={`bg-[var(--panel-2)] border border-[var(--border)] rounded-lg p-2.5 text-left w-full transition-colors ${
        onClick ? 'cursor-pointer hover:border-brand/40' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
        <span className="text-[10.5px] font-bold text-[var(--text-faint)] truncate">{label}</span>
      </div>
      <div className={`font-display text-[17px] font-bold ${color}`}>{score}</div>
      <div className="text-[10px] text-[var(--text-faint)] mt-0.5">{detail}</div>
    </div>
  )
}
