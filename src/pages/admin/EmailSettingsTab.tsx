import { useState } from 'react'
import { Copy, Check, Mail } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useTenantInboundEmail } from './useAdmin'

export function EmailSettingsTab() {
  const { t } = useLang()
  const { data: inboundEmail, isLoading, error } = useTenantInboundEmail()
  const [copied, setCopied] = useState(false)

  function copy() {
    if (!inboundEmail) return
    navigator.clipboard.writeText(inboundEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius-app)] p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4 text-brand-dim" />
          <h3 className="font-display text-[15px] font-bold">{t({ tr: 'Gelen Kutusu Adresiniz', en: 'Your Inbound Address' })}</h3>
        </div>
        <p className="text-[11.5px] text-[var(--text-faint)] mb-3.5">
          {t({
            tr: "Bu adrese gelen e-postalar otomatik olarak Servis Masası talebine dönüşür. Gönderen bilinmiyorsa otomatik bir requester hesabı oluşturulur; aynı thread'deki yanıtlar mevcut talebe yorum olarak eklenir.",
            en: 'Emails sent to this address automatically become Service Desk tickets. If the sender is unknown, a requester account is created automatically; replies in the same thread are added as comments on the existing ticket.',
          })}
        </p>
        {isLoading ? (
          <div className="text-[12px] text-[var(--text-faint)] py-2">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</div>
        ) : error ? (
          <div className="text-[12px] text-p1 py-2">{t({ tr: 'Adres yüklenemedi.', en: 'Failed to load address.' })}</div>
        ) : (
          <div className="flex items-center gap-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2.5">
            <code className="flex-1 text-[13px] font-mono">{inboundEmail}</code>
            <button
              onClick={copy}
              title={t({ tr: 'Kopyala', en: 'Copy' })}
              aria-label={t({ tr: 'Kopyala', en: 'Copy' })}
              className="text-brand-dim shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius-app)] p-5">
        <h3 className="font-display text-[15px] font-bold mb-3">{t({ tr: 'Kurulum Adımları', en: 'Setup Steps' })}</h3>
        <ol className="space-y-2.5 text-[12.5px] text-[var(--text-sub)] list-decimal list-inside">
          <li>
            {t({
              tr: 'Bir e-posta sağlayıcısında (Postmark, Resend veya Mailgun gibi) "inbound parse / gelen e-posta webhook" özelliğini açın.',
              en: 'Enable "inbound parse / inbound email webhook" in an email provider (e.g. Postmark, Resend, or Mailgun).',
            })}
          </li>
          <li>
            {t({
              tr: "Sağlayıcının inbound webhook URL'sini şu şekilde tanımlayın: [Supabase proje URL'niz]/functions/v1/inbound-email?secret=[Edge Function Secrets'a eklediğiniz INBOUND_EMAIL_SECRET]",
              en: "Set the provider's inbound webhook URL to: [your Supabase project URL]/functions/v1/inbound-email?secret=[the INBOUND_EMAIL_SECRET you added to Edge Function Secrets]",
            })}
          </li>
          <li>
            {t({
              tr: 'Sağlayıcı panelinde, yukarıdaki gelen kutusu adresinizin alan adını (@ sonrası) kendi alan adınıza yönlendirin (MX kaydı).',
              en: "In the provider's panel, point the domain (after @) of your inbound address above to your own domain via an MX record.",
            })}
          </li>
        </ol>
        <p className="text-[11px] text-[var(--text-faint)] mt-3.5">
          {t({
            tr: 'Bu adımlar Supabase dışında, e-posta sağlayıcısının kendi panelinden yapılır — teknik ekibinizle birlikte tamamlayabilirsiniz.',
            en: "These steps happen outside Supabase, in the email provider's own panel — you can complete them with your technical team.",
          })}
        </p>
      </div>
    </div>
  )
}
