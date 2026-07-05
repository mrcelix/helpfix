import { useState } from 'react'
import { RotateCcw, CheckCircle2 } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import type { DecisionTree } from './useKnowledgeBase'

export function DecisionTreeViewer({ tree }: { tree: DecisionTree }) {
  const { t } = useLang()
  const [currentKey, setCurrentKey] = useState(tree.startNode)
  const [history, setHistory] = useState<string[]>([])

  const node = tree.nodes[currentKey]
  if (!node) return null

  const isResolution = node.options.length === 0

  function choose(next: string | null) {
    if (!next) return
    setHistory((h) => [...h, currentKey])
    setCurrentKey(next)
  }

  function reset() {
    setHistory([])
    setCurrentKey(tree.startNode)
  }

  function back() {
    const prev = history[history.length - 1]
    if (!prev) return
    setHistory((h) => h.slice(0, -1))
    setCurrentKey(prev)
  }

  return (
    <div className="bg-purple-tint/40 border border-purple/40 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10.5px] font-bold text-purple uppercase">
          🧭 {t({ tr: 'Rehberli Çözüm', en: 'Guided Resolution' })}
        </span>
        <div className="flex gap-2">
          {history.length > 0 && (
            <button onClick={back} className="text-[10.5px] font-semibold text-[var(--text-faint)]">
              {t({ tr: '← Geri', en: '← Back' })}
            </button>
          )}
          <button onClick={reset} className="text-[10.5px] font-semibold text-[var(--text-faint)] flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> {t({ tr: 'Baştan Başla', en: 'Restart' })}
          </button>
        </div>
      </div>

      {isResolution && (
        <div className="flex items-center gap-2 mb-2 text-ok">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-[11px] font-bold uppercase">{t({ tr: 'Çözüm', en: 'Resolution' })}</span>
        </div>
      )}

      <p className="text-[13.5px] font-semibold mb-3 whitespace-pre-wrap">{node.text}</p>

      {!isResolution && (
        <div className="flex flex-wrap gap-2">
          {node.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => choose(opt.next)}
              className="text-[12px] font-bold px-4 py-2 rounded-lg bg-purple text-white hover:opacity-90"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
