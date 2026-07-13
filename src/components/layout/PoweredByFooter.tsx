import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { useLang } from '@/contexts/LangContext'
import { supabase } from '@/lib/supabase'
import { BUILD_SHORT_SHA, BUILD_TIME } from '@/lib/buildInfo'
import { cn } from '@/lib/utils'

/** Sol menünün en altında görünen "Powered By HelpFix" ibaresi.
 * Tıklanınca sürüm, lisans ve canlı sistem durumu bilgisini gösteren
 * bir popup açar — daha önce burada oturum açan kullanıcının adı/
 * rolü gösteriliyordu (Hesabım menüsünde zaten var, burada gereksiz
 * tekrardı), onun yerine geçti. */
export function PoweredByFooter({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'border-t border-[var(--border)] p-3 text-[11px] font-semibold text-[var(--text-faint)] hover:text-brand-dim transition-colors text-center',
          collapsed && 'px-1'
        )}
      >
        {collapsed ? '⚡' : t({ tr: 'Powered By HelpFix', en: 'Powered By HelpFix', fr: 'Propulsé par HelpFix', it: 'Offerto da HelpFix', ar: 'مدعوم من HelpFix' })}
      </button>
      {open && <AppInfoModal onClose={() => setOpen(false)} />}
    </>
  )
}

function useSystemStatus() {
  return useQuery({
    queryKey: ['system-status-check'],
    queryFn: async () => {
      const start = performance.now()
      try {
        const { error } = await supabase.from('tenants').select('id', { count: 'exact', head: true }).limit(1)
        const ms = Math.round(performance.now() - start)
        if (error) return { ok: false, ms }
        return { ok: true, ms }
      } catch {
        return { ok: false, ms: Math.round(performance.now() - start) }
      }
    },
    staleTime: 30_000,
    retry: false,
  })
}

function AppInfoModal({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLang()
  const { data: status, isLoading } = useSystemStatus()

  const buildDate = BUILD_TIME
    ? new Date(BUILD_TIME).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : t({ tr: 'Yerel geliştirme sürümü', en: 'Local development build' })

  const statusLabel = isLoading
    ? t({ tr: 'Kontrol ediliyor…', en: 'Checking…' })
    : status?.ok
      ? t({ tr: 'Tüm Sistemler Çalışıyor', en: 'All Systems Operational' })
      : t({ tr: 'Bağlantı Sorunu Tespit Edildi', en: 'Connectivity Issue Detected' })

  const statusColor = isLoading ? 'bg-[var(--text-faint)]' : status?.ok ? 'bg-ok' : 'bg-p1'
  const statusBg = isLoading ? 'bg-[var(--panel-2)]' : status?.ok ? 'bg-ok/10 border-ok/30' : 'bg-p1-tint border-p1/30'

  return (
    <Modal open onClose={onClose} title={t({ tr: 'HelpFix Hakkında', en: 'About HelpFix' })} widthClass="max-w-[420px]">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-dim flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
              <path d="M12 2 L14.5 8.5 L21 9 L16 13.5 L17.5 20 L12 16.5 L6.5 20 L8 13.5 L3 9 L9.5 8.5 Z" />
            </svg>
          </div>
          <div>
            <div className="font-display text-[15px] font-bold leading-tight">HelpFix</div>
            <div className="text-[11.5px] text-[var(--text-faint)]">{t({ tr: 'Bağlı ITSM Platformu', en: 'Connected ITSM Platform' })}</div>
          </div>
        </div>

        <div className={cn('flex items-center gap-2.5 border rounded-xl px-3.5 py-2.5', statusBg)}>
          <span className={cn('w-2 h-2 rounded-full shrink-0', statusColor, !isLoading && 'animate-pulse')} />
          <span className="text-[12.5px] font-bold flex-1">{statusLabel}</span>
          {status && !isLoading && <span className="text-[10.5px] font-mono text-[var(--text-faint)]">{status.ms}ms</span>}
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-[12px]">
          <InfoRow label={t({ tr: 'Sürüm', en: 'Version' })} value={BUILD_SHORT_SHA} mono />
          <InfoRow label={t({ tr: 'Lisans', en: 'License' })} value={t({ tr: 'Ticari Abonelik', en: 'Commercial Subscription' })} />
          <InfoRow label={t({ tr: 'Son Deploy', en: 'Last Deploy' })} value={buildDate} span2 />
        </div>

        <p className="text-[11px] text-[var(--text-faint)] leading-relaxed pt-2 border-t border-[var(--border)]">
          {t({
            tr: '© 2026 HelpFix. Tüm hakları saklıdır. Bu yazılımın kullanımı, kiracı (tenant) sözleşmenizdeki lisans şartlarına tabidir.',
            en: '© 2026 HelpFix. All rights reserved. Use of this software is subject to the license terms in your tenant agreement.',
          })}
        </p>
      </div>
    </Modal>
  )
}

function InfoRow({ label, value, mono, span2 }: { label: string; value: string; mono?: boolean; span2?: boolean }) {
  return (
    <div className={cn('bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2', span2 && 'col-span-2')}>
      <div className="text-[9.5px] font-bold text-[var(--text-faint)] uppercase tracking-wide mb-0.5">{label}</div>
      <div className={cn('font-semibold truncate', mono && 'font-mono')}>{value}</div>
    </div>
  )
}
