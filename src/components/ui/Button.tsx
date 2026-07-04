import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

const VARIANT_STYLES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dim',
  ghost: 'bg-[var(--panel)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--text-faint)]',
  danger: 'bg-[var(--panel)] border border-p1 text-p1 hover:bg-p1-tint',
}

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'text-[11.5px] px-2.5 py-1.5 rounded-lg gap-1.5',
  md: 'text-[13px] px-4 py-2.5 rounded-lg gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
