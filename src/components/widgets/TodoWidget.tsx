import { useState } from 'react'
import { Plus, X, ListTodo } from 'lucide-react'
import { useLang } from '@/contexts/LangContext'
import { useMyTodos, useAddTodo, useToggleTodo, useDeleteTodo } from '@/hooks/useTodos'

export function TodoWidget() {
  const { t } = useLang()
  const { data: todos } = useMyTodos()
  const addTodo = useAddTodo()
  const toggleTodo = useToggleTodo()
  const deleteTodo = useDeleteTodo()
  const [draft, setDraft] = useState('')

  function handleAdd() {
    const text = draft.trim()
    if (!text) return
    addTodo.mutate(text)
    setDraft('')
  }

  const pending = todos?.filter((t) => !t.is_done) ?? []
  const done = todos?.filter((t) => t.is_done) ?? []

  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius-app)] p-4">
      <h3 className="font-display text-[14px] font-bold flex items-center gap-1.5 mb-3">
        <ListTodo className="w-4 h-4 text-brand-dim" />
        {t({ tr: 'Yapılacaklarım', en: 'My To-Do' })}
        {pending.length > 0 && (
          <span className="text-[10px] font-bold bg-brand-tint text-brand-dim rounded-full px-1.5 py-0.5 ml-auto">{pending.length}</span>
        )}
      </h3>

      <div className="flex items-center gap-1.5 mb-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={t({ tr: 'Yeni not ekle…', en: 'Add a note…' })}
          className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[12.5px]"
        />
        <button onClick={handleAdd} disabled={!draft.trim()} className="w-7 h-7 shrink-0 rounded-lg bg-brand text-white flex items-center justify-center disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto">
        {!todos?.length && <p className="text-[11.5px] text-[var(--text-faint)] italic text-center py-4">{t({ tr: 'Henüz not yok.', en: 'No notes yet.' })}</p>}
        {pending.map((item) => (
          <TodoRow key={item.id} item={item} onToggle={() => toggleTodo.mutate({ id: item.id, isDone: true })} onDelete={() => deleteTodo.mutate(item.id)} />
        ))}
        {done.map((item) => (
          <TodoRow key={item.id} item={item} onToggle={() => toggleTodo.mutate({ id: item.id, isDone: false })} onDelete={() => deleteTodo.mutate(item.id)} />
        ))}
      </div>
    </div>
  )
}

function TodoRow({ item, onToggle, onDelete }: { item: { id: string; text: string; is_done: boolean }; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-[var(--row-hover)]">
      <button
        onClick={onToggle}
        className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${item.is_done ? 'bg-brand border-brand' : 'border-[var(--border)]'}`}
      >
        {item.is_done && <span className="w-1.5 h-1.5 rounded-sm bg-white" />}
      </button>
      <span className={`flex-1 text-[12px] truncate ${item.is_done ? 'line-through text-[var(--text-faint)]' : ''}`}>{item.text}</span>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-[var(--text-faint)] hover:text-p1 shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
