import { useEffect, useState } from 'react'
import { Eye, EyeOff, Save } from 'lucide-react'
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useLang, pickLang } from '@/contexts/LangContext'
import { Button } from '@/components/ui/Button'
import { SURFACES, mergeDashboardLayout, type DashboardSurface, type MergedWidget } from '@/lib/dashboardWidgets'
import { useDashboardLayout, useSaveDashboardLayout } from './useAdmin'

const AutoWidthGridLayout = WidthProvider(GridLayout)

const SURFACE_KEYS = Object.keys(SURFACES) as DashboardSurface[]

export function DashboardLayoutTab() {
  const { lang, t } = useLang()
  const [surface, setSurface] = useState<DashboardSurface>('employee_home')
  const { data: savedRows, isLoading } = useDashboardLayout(surface)
  const saveLayout = useSaveDashboardLayout()
  const [widgets, setWidgets] = useState<MergedWidget[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setWidgets(mergeDashboardLayout(surface, savedRows))
    setDirty(false)
  }, [surface, savedRows])

  const surfaceDef = SURFACES[surface]
  const layout = widgets.map((w) => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h, minW: w.minW, minH: w.minH }))

  function toggleVisible(id: string) {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, isVisible: !w.isVisible } : w)))
    setDirty(true)
  }

  function handleLayoutChange(newLayout: readonly { i: string; x: number; y: number; w: number; h: number }[]) {
    setWidgets((prev) =>
      prev.map((w) => {
        const l = newLayout.find((item) => item.i === w.id)
        return l ? { ...w, x: l.x, y: l.y, w: l.w, h: l.h } : w
      })
    )
    setDirty(true)
  }

  function save() {
    saveLayout.mutate(
      {
        surface,
        widgets: widgets.map((w) => ({ widget_id: w.id, is_visible: w.isVisible, x: w.x, y: w.y, w: w.w, h: w.h })),
      },
      { onSuccess: () => setDirty(false) }
    )
  }

  return (
    <div>
      <p className="text-[12px] text-[var(--text-faint)] mb-4">
        {t({
          tr: 'Widget\'ları sürükleyip boyutlandırarak yerleşimi düzenleyin, göz ikonuyla göster/gizle yapın ve Kaydet\'e basın. Bu yerleşim tüm tenant kullanıcıları için geçerli olur.',
          en: "Drag and resize widgets to arrange the layout, use the eye icon to show/hide, and click Save. This layout applies to all tenant users.",
        })}
      </p>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex flex-wrap gap-1.5">
          {SURFACE_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setSurface(key)}
              className={`text-[12px] font-bold px-3 py-1.5 rounded-lg border ${
                surface === key ? 'bg-brand border-brand text-white' : 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]'
              }`}
            >
              {pickLang(SURFACES[key].label, lang)}
            </button>
          ))}
        </div>
        <Button onClick={save} disabled={!dirty || saveLayout.isPending}>
          <Save className="w-[15px] h-[15px]" />
          {saveLayout.isPending ? t({ tr: 'Kaydediliyor…', en: 'Saving…' }) : t({ tr: 'Kaydet', en: 'Save' })}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {widgets.map((w) => (
          <button
            key={w.id}
            onClick={() => toggleVisible(w.id)}
            aria-pressed={w.isVisible}
            className={`flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg border ${
              w.isVisible
                ? 'bg-[var(--panel)] border-[var(--border)] text-[var(--text-sub)]'
                : 'bg-[var(--panel-2)] border-dashed border-[var(--border)] text-[var(--text-faint)]'
            }`}
          >
            {w.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {pickLang(w.name, lang)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-[13px] text-[var(--text-faint)] py-10 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
      ) : (
        <AutoWidthGridLayout
          className="layout"
          layout={layout}
          cols={surfaceDef.cols}
          rowHeight={surfaceDef.rowHeight}
          isDraggable
          isResizable
          compactType="vertical"
          margin={[14, 14]}
          containerPadding={[0, 0]}
          useCSSTransforms
          onLayoutChange={handleLayoutChange}
        >
          {widgets.map((w) => (
            <div key={w.id} className={`overflow-hidden rounded-[var(--radius-app)] ${w.isVisible ? '' : 'opacity-30 pointer-events-none'}`}>
              <div className="h-full border-2 border-dashed border-brand/40 rounded-[var(--radius-app)] relative">
                <div className="absolute top-1 left-1.5 z-10 text-[9.5px] font-bold bg-[var(--panel)] border border-[var(--border)] text-[var(--text-faint)] rounded px-1.5 py-0.5">
                  {pickLang(w.name, lang)}
                </div>
                <div className="h-full pt-6 px-1 pb-1">
                  <w.component />
                </div>
              </div>
            </div>
          ))}
        </AutoWidthGridLayout>
      )}
    </div>
  )
}
