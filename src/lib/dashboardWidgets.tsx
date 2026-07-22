import type { ComponentType } from 'react'
import { TodoWidget } from '@/components/widgets/TodoWidget'
import { KpiStatsWidget } from '@/pages/employee-center/widgets/KpiStatsWidget'
import { QuickActionsWidget } from '@/pages/employee-center/widgets/QuickActionsWidget'
import { TicketVolumeChartWidget } from '@/pages/employee-center/widgets/TicketVolumeChartWidget'
import { RecentTicketsWidget } from '@/pages/employee-center/widgets/RecentTicketsWidget'
import { ScorecardWidget } from '@/pages/store-performance/widgets/ScorecardWidget'
import { ScoreDistributionWidget } from '@/pages/store-performance/widgets/ScoreDistributionWidget'
import { IntegrationStatusWidget } from '@/pages/store-performance/widgets/IntegrationStatusWidget'
import { PriorityBreakdownWidget } from '@/pages/service-desk/widgets/PriorityBreakdownWidget'
import { SlaRiskWidget } from '@/pages/service-desk/widgets/SlaRiskWidget'
import { ResolvedTodayWidget } from '@/pages/service-desk/widgets/ResolvedTodayWidget'
import { MyStoreHealthWidget } from '@/pages/employee-center/widgets/MyStoreHealthWidget'
import { MyStoreLinesWidget } from '@/pages/employee-center/widgets/MyStoreLinesWidget'
import { MyStoreSummaryWidget } from '@/pages/employee-center/widgets/MyStoreSummaryWidget'
import { MyStoreActivityWidget } from '@/pages/employee-center/widgets/MyStoreActivityWidget'

export type DashboardSurface = 'employee_home' | 'store_performance_dashboard' | 'wallboard' | 'my_store'

export interface WidgetDef {
  id: string
  name: { tr: string; en: string }
  component: ComponentType
  defaultLayout: { x: number; y: number; w: number; h: number }
  minW?: number
  minH?: number
}

export interface MergedWidget extends WidgetDef {
  x: number
  y: number
  w: number
  h: number
  isVisible: boolean
}

/** Registry varsayılanlarını DB'deki kaydedilmiş satırlarla birleştirir —
 * bir widget için DB'de satır yoksa registry'deki defaultLayout + görünür
 * kullanılır. Hem salt-okunur sayfalarda hem admin editöründe kullanılır. */
export function mergeDashboardLayout(
  surface: DashboardSurface,
  savedRows: { widget_id: string; is_visible: boolean; x: number; y: number; w: number; h: number }[] | undefined
): MergedWidget[] {
  const byId = new Map((savedRows ?? []).map((r) => [r.widget_id, r]))
  return SURFACES[surface].widgets.map((w) => {
    const saved = byId.get(w.id)
    return {
      ...w,
      x: saved?.x ?? w.defaultLayout.x,
      y: saved?.y ?? w.defaultLayout.y,
      w: saved?.w ?? w.defaultLayout.w,
      h: saved?.h ?? w.defaultLayout.h,
      isVisible: saved?.is_visible ?? true,
    }
  })
}

export const SURFACES: Record<DashboardSurface, { label: { tr: string; en: string }; cols: number; rowHeight: number; widgets: WidgetDef[] }> = {
  employee_home: {
    label: { tr: 'Çalışan Ana Sayfası', en: 'Employee Home' },
    cols: 12,
    rowHeight: 36,
    widgets: [
      { id: 'kpi-stats', name: { tr: 'KPI Kartları', en: 'KPI Cards' }, component: KpiStatsWidget, defaultLayout: { x: 0, y: 0, w: 12, h: 3 }, minH: 3, minW: 6 },
      { id: 'quick-actions', name: { tr: 'Hızlı Erişim', en: 'Quick Actions' }, component: QuickActionsWidget, defaultLayout: { x: 0, y: 3, w: 12, h: 3 }, minH: 3, minW: 6 },
      { id: 'ticket-volume-chart', name: { tr: 'Talep Hacmi Grafiği', en: 'Ticket Volume Chart' }, component: TicketVolumeChartWidget, defaultLayout: { x: 0, y: 6, w: 8, h: 6 }, minH: 4, minW: 4 },
      { id: 'todo', name: { tr: 'Yapılacaklarım', en: 'My To-Do' }, component: TodoWidget, defaultLayout: { x: 8, y: 6, w: 4, h: 6 }, minH: 4, minW: 3 },
      { id: 'recent-tickets', name: { tr: 'Son Taleplerim', en: 'My Recent Tickets' }, component: RecentTicketsWidget, defaultLayout: { x: 0, y: 12, w: 12, h: 6 }, minH: 4, minW: 6 },
    ],
  },
  store_performance_dashboard: {
    label: { tr: 'Mağaza Performansı Dashboard', en: 'Store Performance Dashboard' },
    cols: 12,
    rowHeight: 36,
    widgets: [
      { id: 'scorecard', name: { tr: 'Mağaza Skor Kartı', en: 'Store Scorecard' }, component: ScorecardWidget, defaultLayout: { x: 0, y: 0, w: 8, h: 10 }, minH: 6, minW: 5 },
      { id: 'score-distribution', name: { tr: 'Skor Dağılımı', en: 'Score Distribution' }, component: ScoreDistributionWidget, defaultLayout: { x: 8, y: 0, w: 4, h: 6 }, minH: 4, minW: 3 },
      { id: 'integration-status', name: { tr: 'Entegrasyon Durumu', en: 'Integration Status' }, component: IntegrationStatusWidget, defaultLayout: { x: 8, y: 6, w: 4, h: 4 }, minH: 3, minW: 3 },
    ],
  },
  wallboard: {
    label: { tr: 'Duvar Ekranı', en: 'Wallboard' },
    cols: 12,
    rowHeight: 36,
    widgets: [
      { id: 'priority-breakdown', name: { tr: 'Öncelik Dağılımı', en: 'Priority Breakdown' }, component: PriorityBreakdownWidget, defaultLayout: { x: 0, y: 0, w: 12, h: 4 }, minH: 3, minW: 6 },
      { id: 'sla-risk', name: { tr: 'SLA Riskindekiler', en: 'SLA At Risk' }, component: SlaRiskWidget, defaultLayout: { x: 0, y: 4, w: 8, h: 10 }, minH: 6, minW: 5 },
      { id: 'resolved-today', name: { tr: 'Bugün Çözülen', en: 'Resolved Today' }, component: ResolvedTodayWidget, defaultLayout: { x: 8, y: 4, w: 4, h: 10 }, minH: 4, minW: 3 },
    ],
  },
  my_store: {
    label: { tr: 'Mağazam', en: 'My Store' },
    cols: 12,
    rowHeight: 36,
    widgets: [
      { id: 'store-health', name: { tr: 'Mağaza Sağlığı', en: 'Store Health' }, component: MyStoreHealthWidget, defaultLayout: { x: 0, y: 0, w: 12, h: 8 }, minH: 5, minW: 6 },
      { id: 'store-lines', name: { tr: 'Hat Durumları', en: 'Line Status' }, component: MyStoreLinesWidget, defaultLayout: { x: 0, y: 8, w: 7, h: 10 }, minH: 5, minW: 5 },
      { id: 'store-summary', name: { tr: 'Özet (KPI + 3. Parti)', en: 'Summary (KPIs + Third-Party)' }, component: MyStoreSummaryWidget, defaultLayout: { x: 7, y: 8, w: 5, h: 10 }, minH: 5, minW: 4 },
      { id: 'store-activity', name: { tr: 'Talepler & Cihazlar', en: 'Tickets & Devices' }, component: MyStoreActivityWidget, defaultLayout: { x: 0, y: 18, w: 12, h: 8 }, minH: 5, minW: 6 },
    ],
  },
}
