import { useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'

// Web Speech API için minimal tip tanımları — TypeScript'in dom lib'i
// bu API'yi henüz standart tanımıyor, tarayıcılarda (Chrome/Edge/Safari)
// window.SpeechRecognition ya da window.webkitSpeechRecognition olarak yer alıyor.
interface MinimalSpeechRecognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => MinimalSpeechRecognition

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Konuşmayı metne çevirip `onResult` ile ileten mikrofon butonu.
 * Tarayıcı desteklemiyorsa (nadir) hiçbir şey render etmez. */
export function VoiceInputButton({ onResult, className }: { onResult: (text: string) => void; className?: string }) {
  const { lang, t } = useLang()
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null)

  useEffect(() => {
    return () => recognitionRef.current?.stop()
  }, [])

  const Ctor = getSpeechRecognitionCtor()
  if (!Ctor) return null

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const recognition = new Ctor!()
    recognition.lang = lang === 'tr' ? 'tr-TR' : 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript
      if (transcript) onResult(transcript)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={t({ tr: listening ? 'Dinleniyor… durdurmak için tıklayın' : 'Sesli komut', en: listening ? 'Listening… click to stop' : 'Voice input' })}
      className={
        className ??
        `shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
          listening ? 'bg-p1-tint text-p1 animate-pulse' : 'text-[var(--text-faint)] hover:text-brand-dim'
        }`
      }
    >
      <Mic className="w-[13px] h-[13px]" />
    </button>
  )
}
