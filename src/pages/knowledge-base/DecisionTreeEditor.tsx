import { useState } from 'react'
import { Plus, Trash2, Star } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import type { DecisionTree } from './useKnowledgeBase'

let nodeCounter = 0
function newNodeKey() {
  nodeCounter += 1
  return `n${Date.now().toString(36)}${nodeCounter}`
}

export function DecisionTreeEditor({
  initialTree,
  onSave,
  onCancel,
}: {
  initialTree: DecisionTree | null
  onSave: (tree: DecisionTree) => void
  onCancel: () => void
}) {
  const { t } = useLang()
  const [tree, setTree] = useState<DecisionTree>(
    initialTree ?? {
      startNode: 'n1',
      nodes: { n1: { text: '', options: [] } },
    }
  )

  function updateNodeText(key: string, text: string) {
    setTree((tr) => ({ ...tr, nodes: { ...tr.nodes, [key]: { ...tr.nodes[key], text } } }))
  }

  function addOption(key: string) {
    setTree((tr) => ({
      ...tr,
      nodes: { ...tr.nodes, [key]: { ...tr.nodes[key], options: [...tr.nodes[key].options, { label: '', next: null }] } },
    }))
  }

  function updateOption(key: string, idx: number, patch: Partial<{ label: string; next: string | null }>) {
    setTree((tr) => {
      const opts = [...tr.nodes[key].options]
      opts[idx] = { ...opts[idx], ...patch }
      return { ...tr, nodes: { ...tr.nodes, [key]: { ...tr.nodes[key], options: opts } } }
    })
  }

  function deleteOption(key: string, idx: number) {
    setTree((tr) => {
      const opts = tr.nodes[key].options.filter((_, i) => i !== idx)
      return { ...tr, nodes: { ...tr.nodes, [key]: { ...tr.nodes[key], options: opts } } }
    })
  }

  function addNode() {
    const key = newNodeKey()
    setTree((tr) => ({ ...tr, nodes: { ...tr.nodes, [key]: { text: '', options: [] } } }))
  }

  function deleteNode(key: string) {
    if (key === tree.startNode) return
    setTree((tr) => {
      const nodes = { ...tr.nodes }
      delete nodes[key]
      return { ...tr, nodes }
    })
  }

  const nodeKeys = Object.keys(tree.nodes)

  return (
    <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-2xl p-4">
      <div className="text-[12.5px] font-bold mb-3">{t({ tr: 'Karar Ağacı Düzenleyici', en: 'Decision Tree Editor' })}</div>

      <div className="space-y-3 mb-3">
        {nodeKeys.map((key) => (
          <div key={key} className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              {key === tree.startNode ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-purple">
                  <Star className="w-3 h-3 fill-purple" /> {t({ tr: 'BAŞLANGIÇ', en: 'START' })}
                </span>
              ) : (
                <button onClick={() => setTree((tr) => ({ ...tr, startNode: key }))} className="text-[10px] font-semibold text-[var(--text-faint)]">
                  {t({ tr: 'Başlangıç yap', en: 'Set as start' })}
                </button>
              )}
              <span className="text-[10px] font-mono text-[var(--text-faint)] ml-auto">{key}</span>
              {key !== tree.startNode && (
                <button onClick={() => deleteNode(key)} className="text-[var(--text-faint)] hover:text-p1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <textarea
              value={tree.nodes[key].text}
              onChange={(e) => updateNodeText(key, e.target.value)}
              rows={2}
              placeholder={t({ tr: 'Soru veya talimat metni…', en: 'Question or instruction text…' })}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-[12px] mb-2 resize-none"
            />
            <div className="space-y-1.5">
              {tree.nodes[key].options.map((opt, i) => (
                <div key={i} className="flex gap-1.5">
                  <input
                    value={opt.label}
                    onChange={(e) => updateOption(key, i, { label: e.target.value })}
                    placeholder={t({ tr: 'Seçenek metni (örn. Evet)', en: 'Option text (e.g. Yes)' })}
                    className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[11.5px]"
                  />
                  <select
                    value={opt.next ?? ''}
                    onChange={(e) => updateOption(key, i, { next: e.target.value || null })}
                    className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[11.5px]"
                  >
                    <option value="">{t({ tr: 'Sonraki düğüm…', en: 'Next node…' })}</option>
                    {nodeKeys.filter((k) => k !== key).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => deleteOption(key, i)} className="text-[var(--text-faint)] hover:text-p1 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addOption(key)}
              className="mt-1.5 text-[10.5px] font-semibold text-purple flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> {t({ tr: 'Seçenek Ekle', en: 'Add Option' })}
            </button>
            {tree.nodes[key].options.length === 0 && (
              <p className="text-[10px] text-[var(--text-faint)] italic mt-1">
                {t({ tr: 'Seçeneksiz düğüm = çözüm/bitiş noktası', en: 'No options = resolution/end point' })}
              </p>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addNode}
        className="w-full mb-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-[11.5px] font-semibold text-[var(--text-faint)] flex items-center justify-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" /> {t({ tr: 'Yeni Düğüm', en: 'New Node' })}
      </button>

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[12px] font-bold">
          {t({ tr: 'Vazgeç', en: 'Cancel' })}
        </button>
        <button onClick={() => onSave(tree)} className="flex-1 py-2 rounded-lg bg-brand text-white text-[12px] font-bold">
          {t({ tr: 'Karar Ağacını Kaydet', en: 'Save Decision Tree' })}
        </button>
      </div>
    </div>
  )
}
