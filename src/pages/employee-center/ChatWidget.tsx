import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Sparkles, Loader2, Ticket } from 'lucide-react'
import { logAiEvent } from '@/pages/service-desk/useAiEvents'
import { useLang } from '@/contexts/LangContext'
import { useNavigate } from 'react-router-dom'
import { useChatMessages, useSendChatMessage } from './useChat'

export function ChatWidget() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [deflectionLogged, setDeflectionLogged] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: messages } = useChatMessages(conversationId)
  const sendMessage = useSendChatMessage()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sendMessage.isPending])

  async function handleSend() {
    const text = draft.trim()
    if (!text || sendMessage.isPending) return
    setDraft('')
    try {
      const result = await sendMessage.mutateAsync({ conversationId, message: text })
      if (!conversationId) setConversationId(result.conversationId)
    } catch {
      // Hata zaten sendMessage.error üzerinden UI'da gösteriliyor
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-brand to-brand-dim shadow-2xl flex items-center justify-center text-white hover:scale-105 transition-transform"
        aria-label="AI Asistan"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {open && (
        <div className="fixed bottom-36 md:bottom-24 right-4 md:right-6 z-40 w-[calc(100vw-32px)] max-w-[380px] h-[520px] max-h-[70vh] bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-brand-tint">
            <Sparkles className="w-4 h-4 text-brand-dim shrink-0" />
            <div>
              <div className="text-[13px] font-bold">{t({ tr: 'AI Destek Asistanı', en: 'AI Support Assistant', fr: 'Assistant IA', it: 'Assistente IA', ar: 'مساعد الدعم بالذكاء الاصطناعي' })}</div>
              <div className="text-[10.5px] text-[var(--text-faint)]">{t({ tr: 'Sorunuzu yazın, yardımcı olayım', en: 'Ask me anything about your issue', fr: 'Posez-moi une question sur votre problème', it: 'Chiedimi qualcosa sul tuo problema', ar: 'اسألني عن مشكلتك' })}</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
            {!messages?.length && (
              <div className="text-[12px] text-[var(--text-faint)] italic text-center py-8 px-4">
                {t({
                  tr: 'Merhaba! Bir IT sorununuz mu var? Yazın, birlikte çözelim — çözemezsem sizin adınıza talep açabilirim.',
                  en: "Hi! Have an IT issue? Tell me about it — if I can't solve it, I can open a ticket for you.",
                })}
              </div>
            )}
            {messages?.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ' +
                    (m.role === 'user' ? 'bg-brand text-white rounded-br-sm' : 'bg-[var(--panel-2)] border border-[var(--border)] rounded-bl-sm')
                  }
                >
                  {m.content}
                  {m.created_incident_id && (
                    <button
                      onClick={() => {
                        setOpen(false)
                        navigate(`/my-tickets?open=${m.created_incident_id}`)
                      }}
                      className="flex items-center gap-1 mt-2 text-[11px] font-bold text-brand-dim bg-[var(--panel)] rounded-lg px-2.5 py-1.5 border border-brand/30"
                    >
                      <Ticket className="w-3 h-3" />
                      {t({ tr: 'Talebi Görüntüle', en: 'View Ticket', fr: 'Voir le ticket', it: 'Visualizza ticket', ar: 'عرض الطلب' })}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--text-faint)]" />
                </div>
              </div>
            )}
            {sendMessage.isError && <div className="text-[11.5px] text-p1 text-center px-4">{(sendMessage.error as Error).message}</div>}
            {/* Faz 3 — deflection onayı: asistan yanıt verdi, talep açılmadı */}
            {!!messages?.length &&
              messages.some((m) => m.role === 'assistant') &&
              !messages.some((m) => m.created_incident_id) &&
              !sendMessage.isPending && (
                deflectionLogged ? (
                  <div className="text-[11px] text-ok text-center py-1">
                    {t({ tr: 'Harika! İyi çalışmalar 🎉', en: 'Great! Have a nice day 🎉' })}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      logAiEvent({ eventType: 'chat_deflected' })
                      setDeflectionLogged(true)
                    }}
                    className="self-center text-[11px] font-bold text-ok border border-ok/30 bg-ok/10 rounded-full px-3 py-1.5 hover:bg-ok/20"
                  >
                    {t({ tr: '✓ Sorunum çözüldü', en: '✓ My issue is resolved' })}
                  </button>
                )
              )}
          </div>

          <div className="flex items-center gap-1.5 p-2.5 border-t border-[var(--border)]">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t({ tr: 'Mesajınızı yazın…', en: 'Type your message…', fr: 'Écrivez votre message…', it: 'Scrivi il tuo messaggio…', ar: 'اكتب رسالتك…' })}
              className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sendMessage.isPending}
              className="w-9 h-9 shrink-0 rounded-lg bg-brand text-white flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
