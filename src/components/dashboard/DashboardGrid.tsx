import GridLayout, { WidthProvider } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useLang } from '@/contexts/LangContext'
import { useDashboardLayout } from '@/pages/admin/useAdmin'
import { SURFACES, mergeDashboardLayout, type DashboardSurface } from '@/lib/dashboardWidgets'

const AutoWidthGridLayout = WidthProvider(GridLayout)

/** Bir surface'in widget'larını admin panelde kaydedilmiş yerleşime göre
 * salt-okunur (sürüklenemez/boyutlandırılamaz) gösterir. Düzenleme UI'ı
 * için bkz. src/pages/admin/DashboardLayoutTab.tsx. */
export function DashboardGrid({ surface }: { surface: DashboardSurface }) {
  const { t } = useLang()
  const { data: savedRows, isLoading } = useDashboardLayout(surface)
  const surfaceDef = SURFACES[surface]

  if (isLoading) {
    return <p className="text-[13px] text-[var(--text-faint)] py-10 text-center">{t({ tr: 'Yükleniyor…', en: 'Loading…' })}</p>
  }

  const merged = mergeDashboardLayout(surface, savedRows).filter((w) => w.isVisible)
  const layout = merged.map((w) => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h, minW: w.minW, minH: w.minH }))

  return (
    <AutoWidthGridLayout
      className="layout"
      layout={layout}
      cols={surfaceDef.cols}
      rowHeight={surfaceDef.rowHeight}
      isDraggable={false}
      isResizable={false}
      compactType="vertical"
      margin={[14, 14]}
      containerPadding={[0, 0]}
      useCSSTransforms
    >
      {merged.map((w) => (
        <div key={w.id} className="overflow-hidden">
          <w.component />
        </div>
      ))}
    </AutoWidthGridLayout>
  )
}
