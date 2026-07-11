import { useState, useEffect } from 'react'
import { Search, Sun, Moon, Bell, Check, Menu, Maximize, Minimize } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useLang } from '@/contexts/LangContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useNotifications, useMarkAsRead, useMarkAllAsRead, type Notification } from './useNotifications'
import { AccountMenu } from './AccountMenu'
import { LanguageSwitcher } from './LanguageSwitcher'
import { cn } from '@/lib/utils'

const TYPE_ICON: Record<string, string> = {
  ticket_assigned: '🎫',
  approval_needed: '✅',
  swap_request: '🔄',
  new_comment: '💬',
}

function openCommandPalette() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }))
}

export function Topbar({ crumb, onMenuClick, homePath = '/service-desk' }: { crumb: string; onMenuClick?: () => void; homePath?: string }) {
  const { lang, t } = useLang()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen().catch(() => {
        // Tarayıcı izin vermezse (ör. iframe içinde) sessizce yoksay
      })
    }
  }

  const { data: notifications } = useNotifications()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()
  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0

  function openNotification(n: Notification) {
    if (!n.is_read) markAsRead.mutate(n.id)
    setShowNotifications(false)
    if (n.link) navigate(n.link)
  }

  return (
    <header className="h-[60px] border-b border-[var(--border)] flex items-center gap-2.5 sm:gap-4 px-3 sm:px-6 sticky top-0 bg-[var(--bg)] z-20">
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[var(--text-sub)] hover:bg-[var(--panel)]"
          aria-label="Menu"
        >
          <Menu className="w-[19px] h-[19px]" />
        </button>
      )}

      <div className="hidden sm:block text-xs text-[var(--text-faint)] shrink-0">
        <Link to={homePath} className="hover:text-[var(--text-sub)] transition-colors">
          HelpFix
        </Link>{' '}
        / <b className="text-[var(--text)] font-semibold">{crumb}</b>
      </div>

      <button
        onClick={openCommandPalette}
        className="flex-1 sm:max-w-[380px] flex items-center gap-2 bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-1.5 sm:ml-3 text-left"
      >
        <Search className="w-[15px] h-[15px] text-[var(--text-faint)] shrink-0" />
        <span className="hidden sm:inline text-[13px] text-[var(--text-faint)] flex-1">{t({ tr: 'Her yerde ara…', en: 'Search anywhere…', fr: 'Rechercher partout…', it: 'Cerca ovunque…', ar: 'ابحث في كل مكان…' })}</span>
        <span className="hidden md:inline text-[9.5px] font-mono font-bold bg-[var(--panel-2)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text-faint)]">
          ⌘K
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <LanguageSwitcher />

        <button
          onClick={toggleFullscreen}
          className="hidden sm:flex w-[34px] h-[34px] shrink-0 rounded-lg border border-[var(--border)] bg-[var(--panel)] items-center justify-center text-[var(--text-sub)]"
          aria-label="Toggle fullscreen"
          title={isFullscreen ? t({ tr: 'Tam Ekrandan Çık', en: 'Exit Fullscreen', fr: 'Quitter le plein écran', it: 'Esci da schermo intero', ar: 'الخروج من ملء الشاشة' }) : t({ tr: 'Tam Ekran', en: 'Fullscreen', fr: 'Plein écran', it: 'Schermo intero', ar: 'ملء الشاشة' })}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        <button
          onClick={toggleTheme}
          className="w-[34px] h-[34px] shrink-0 rounded-lg border border-[var(--border)] bg-[var(--panel)] flex items-center justify-center text-[var(--text-sub)]"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotifications((s) => !s)}
            className={cn(
              'relative w-[34px] h-[34px] shrink-0 rounded-lg border flex items-center justify-center transition-colors',
              unreadCount > 0
                ? 'border-p1/40 bg-p1-tint text-p1'
                : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-sub)]'
            )}
            aria-label="Notifications"
          >
            <Bell className={unreadCount > 0 ? 'w-4 h-4 animate-bell-ring' : 'w-4 h-4'} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-p1 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-p1 border-[1.5px] border-[var(--bg)]" />
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
              <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-[64px] sm:top-[calc(100%+8px)] sm:w-[340px] bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-2xl z-40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                  <span className="font-bold text-[13px]">{t({ tr: 'Bildirimler', en: 'Notifications', fr: 'Notifications', it: 'Notifiche', ar: 'الإشعارات' })}</span>
                  {unreadCount > 0 && (
                    <button onClick={() => markAllAsRead.mutate()} className="text-[10.5px] font-semibold text-brand-dim flex items-center gap-1">
                      <Check className="w-3 h-3" /> {t({ tr: 'Tümünü okundu yap', en: 'Mark all read', fr: 'Tout marquer comme lu', it: 'Segna tutto come letto', ar: 'وضع علامة على الكل كمقروء' })}
                    </button>
                  )}
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {!notifications?.length && (
                    <p className="text-[12px] text-[var(--text-faint)] text-center py-8">
                      {t({ tr: 'Henüz bildirim yok.', en: 'No notifications yet.', fr: 'Aucune notification pour le moment.', it: 'Nessuna notifica al momento.', ar: 'لا توجد إشعارات بعد.' })}
                    </p>
                  )}
                  {notifications?.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className={cn(
                        'w-full flex items-start gap-2.5 px-4 py-3 text-left border-b border-[var(--border)] last:border-0 hover:bg-[var(--row-hover)]',
                        !n.is_read && 'bg-brand-tint/30'
                      )}
                    >
                      <span className="text-[16px] shrink-0">{TYPE_ICON[n.type] ?? '🔔'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold leading-snug">{n.title}</div>
                        {n.body && <div className="text-[11px] text-[var(--text-faint)] truncate">{n.body}</div>}
                        <div className="text-[10px] text-[var(--text-faint)] mt-0.5">
                          {new Date(n.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                        </div>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <AccountMenu />
      </div>
    </header>
  )
}
